import { describe, it, expect } from "vitest";
import { projeter } from "../../src/exercices/projection";
import { EXERCICES_RECETTE } from "../../src/exercices/donnees/recette";

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
