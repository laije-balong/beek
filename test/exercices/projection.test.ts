import { describe, it, expect } from "vitest";
import { projeter } from "../../src/exercices/projection";
import { EXERCICES_RECETTE } from "../../src/exercices/donnees/recette";
import type { Exercice } from "../../src/exercices/types";

const CHAMPS_CACHES = [
  "reponsesAcceptees",
  "erreursPrevues",
  "ordresAcceptes",
  "paires",
  "indicesGauche",
  "valeurAttendue",
  "versionsAcceptees",
  "codesAcceptes",
  "correcte",
  "lectureNumerique",
  "explicationDetaillee",
  "indiceGenerique",
];

describe("projection publique d'un exercice (EM-EXE-03, critere 7)", () => {
  it("ne contient aucun champ de reponse ni d'explication", () => {
    for (const ex of EXERCICES_RECETTE) {
      const json = JSON.stringify(projeter(ex));
      for (const champ of CHAMPS_CACHES) {
        expect(json).not.toContain(champ);
      }
    }
  });

  it("retire la reponse attendue du binaire et du symbole", () => {
    const bin = projeter(EXERCICES_RECETTE.find((e) => e.identifiant === "MACH-DEC-S08E03")!);
    expect(JSON.stringify(bin)).not.toContain("0110");
    const sym = projeter(EXERCICES_RECETTE.find((e) => e.identifiant === "LOGI-DEC-S09E04")!);
    expect(JSON.stringify(sym)).not.toContain("≥");
  });

  it("masque la reponse de la recherche d'erreur et du code de validation (T07, T10)", () => {
    const commun = {
      nature: "exercice" as const,
      titre: "t",
      notionId: "n",
      filRougeId: null,
      dureeMinutes: 5,
      enonce: "q",
      images: [],
      collageAutorise: true,
      indiceGenerique: "g",
      explicationDetaillee: "e",
    };
    const t07: Exercice = {
      ...commun,
      identifiant: "X-T07",
      contenu: {
        type: "T07",
        depart: "=SOMME(A1:A10",
        mode: "exact",
        versionsAcceptees: ["=SOMME(A1:A10)"],
        erreursPrevues: [],
      },
    };
    const t10: Exercice = {
      ...commun,
      identifiant: "X-T10",
      contenu: {
        type: "T10",
        consigne: "c",
        lienTP: "https://exemple.fr/tp",
        codesAcceptes: ["MWINDA42"],
        erreursPrevues: [],
      },
    };
    expect(JSON.stringify(projeter(t07))).not.toContain("versionsAcceptees");
    expect(JSON.stringify(projeter(t10))).not.toContain("codesAcceptes");
    expect(JSON.stringify(projeter(t10))).not.toContain("MWINDA42");
  });

  it("garde le contenu public utile a l'affichage", () => {
    const vf = projeter(EXERCICES_RECETTE.find((e) => e.identifiant === "HIST-DEC-S01E04")!);
    if (vf.contenu.type !== "T05") throw new Error("type attendu T05");
    expect(vf.contenu.trous).toHaveLength(5);
    expect(vf.contenu.trous[0].liste).toBe(true);
    expect(vf.contenu.trous[0].choix).toEqual(["Vrai", "Faux"]);
    expect(vf.titre).toBeTruthy();
    expect(vf.enonceHtml).toContain("<p>");
  });
});
