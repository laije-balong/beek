import { describe, it, expect } from "vitest";
import { corriger } from "../../src/exercices/correction";
import { EXERCICES_RECETTE } from "../../src/exercices/donnees/recette";
import type { Exercice } from "../../src/exercices/types";

function recette(id: string): Exercice {
  return EXERCICES_RECETTE.find((e) => e.identifiant === id)!;
}

describe("moteur de correction (UC-05)", () => {
  it("vrai ou faux : juste, et indice cible sur la phrase fausse (T05)", () => {
    const ex = recette("HIST-DEC-S01E04");
    expect(corriger(ex, { type: "T05", trous: ["Vrai", "Faux", "Vrai", "Vrai", "Faux"] }).juste).toBe(
      true
    );
    const r = corriger(ex, { type: "T05", trous: ["Vrai", "Vrai", "Vrai", "Vrai", "Faux"] });
    expect(r.juste).toBe(false);
    expect(r.indice).toMatch(/Pascaline/);
  });

  it("binaire sur 4 bits : 0110 juste, 110 faux avec son indice (T02 exact)", () => {
    const ex = recette("MACH-DEC-S08E03");
    expect(corriger(ex, { type: "T02", saisie: "0110" }).juste).toBe(true);
    const r = corriger(ex, { type: "T02", saisie: "110" });
    expect(r.juste).toBe(false);
    expect(r.indice).toMatch(/4 bits/);
  });

  it("calcul a trois resultats : lecture numerique et indice par trou (T05, 3.5)", () => {
    const ex = recette("LOGI-DEC-S06E05");
    expect(corriger(ex, { type: "T05", trous: ["300", "1500", "1800"] }).juste).toBe(true);
    // Un espace dans le montant est tolere.
    expect(corriger(ex, { type: "T05", trous: ["300", "1 500", "1800"] }).juste).toBe(true);
    const r = corriger(ex, { type: "T05", trous: ["300", "999", "1800"] });
    expect(r.juste).toBe(false);
    expect(r.indice).toMatch(/heure/);
  });

  it("condition de la remise : ≥ et >= justes, > faux (T05 pseudo-code)", () => {
    const ex = recette("LOGI-DEC-S09E04");
    expect(corriger(ex, { type: "T05", trous: ["≥"] }).juste).toBe(true);
    expect(corriger(ex, { type: "T05", trous: [">="] }).juste).toBe(true);
    expect(corriger(ex, { type: "T05", trous: [">"] }).juste).toBe(false);
  });

  it("remise dans l'ordre : bon ordre juste, sinon indice de l'element mal place (T03)", () => {
    const ex = recette("LOGI-DEC-S03E03");
    expect(corriger(ex, { type: "T03", ordre: ["b", "a", "e", "d", "c"] }).juste).toBe(true);
    const r = corriger(ex, { type: "T03", ordre: ["e", "b", "a", "d", "c"] });
    expect(r.juste).toBe(false);
    expect(r.indice).toMatch(/nombre de copies/);
  });

  it("QCM choix unique : indice de l'option fausse cochee, sinon generique (T01)", () => {
    const ex: Exercice = {
      identifiant: "X-T01",
      nature: "exercice",
      titre: "t",
      notionId: "n",
      filRougeId: null,
      dureeMinutes: 5,
      enonce: "q",
      images: [],
      collageAutorise: true,
      indiceGenerique: "indice generique",
      explicationDetaillee: "exp",
      contenu: {
        type: "T01",
        question: "q",
        choixMultiple: false,
        melange: true,
        options: [
          { texte: "mauvaise", correcte: false, indice: "indice option 0" },
          { texte: "bonne", correcte: true },
          { texte: "autre mauvaise", correcte: false },
        ],
      },
    };
    expect(corriger(ex, { type: "T01", optionsCochees: [1] }).juste).toBe(true);
    expect(corriger(ex, { type: "T01", optionsCochees: [0] }).indice).toBe("indice option 0");
    expect(corriger(ex, { type: "T01", optionsCochees: [2] }).indice).toBe("indice generique");
  });

  it("association de paires : indice du premier element de gauche mal associe (T04)", () => {
    const ex: Exercice = {
      identifiant: "X-T04",
      nature: "exercice",
      titre: "t",
      notionId: "n",
      filRougeId: null,
      dureeMinutes: 5,
      enonce: "q",
      images: [],
      collageAutorise: true,
      indiceGenerique: "indice generique",
      explicationDetaillee: "exp",
      contenu: {
        type: "T04",
        consigne: "reliez",
        gauche: [
          { id: "g1", texte: "Pascal" },
          { id: "g2", texte: "Napier" },
        ],
        droite: [
          { id: "d1", texte: "Pascaline" },
          { id: "d2", texte: "batons" },
        ],
        paires: [
          { gaucheId: "g1", droiteId: "d1" },
          { gaucheId: "g2", droiteId: "d2" },
        ],
        indicesGauche: { g1: "indice g1" },
      },
    };
    expect(
      corriger(ex, {
        type: "T04",
        paires: [
          { gaucheId: "g1", droiteId: "d1" },
          { gaucheId: "g2", droiteId: "d2" },
        ],
      }).juste
    ).toBe(true);
    const r = corriger(ex, {
      type: "T04",
      paires: [
        { gaucheId: "g1", droiteId: "d2" },
        { gaucheId: "g2", droiteId: "d1" },
      ],
    });
    expect(r.juste).toBe(false);
    expect(r.indice).toBe("indice g1");
  });

  it("calcul : valeur juste, erreur prevue avec son indice, sinon generique (T09)", () => {
    const ex: Exercice = {
      identifiant: "X-T09",
      nature: "exercice",
      titre: "t",
      notionId: "n",
      filRougeId: null,
      dureeMinutes: 5,
      enonce: "q",
      images: [],
      collageAutorise: true,
      indiceGenerique: "indice generique",
      explicationDetaillee: "exp",
      contenu: {
        type: "T09",
        question: "13 en binaire",
        valeurAttendue: "1101",
        format: "binaire",
        erreursPrevues: [{ valeur: "1011", indice: "Relisez vos restes de bas en haut." }],
      },
    };
    expect(corriger(ex, { type: "T09", saisie: "1101" }).juste).toBe(true);
    expect(corriger(ex, { type: "T09", saisie: "1011" }).indice).toMatch(/restes/);
    expect(corriger(ex, { type: "T09", saisie: "0000" }).indice).toBe("indice generique");
  });

  it("recherche d'erreur : version corrigee juste, erreur prevue avec indice (T07)", () => {
    const ex: Exercice = {
      identifiant: "X-T07",
      nature: "exercice",
      titre: "t",
      notionId: "n",
      filRougeId: null,
      dureeMinutes: 5,
      enonce: "q",
      images: [],
      collageAutorise: true,
      indiceGenerique: "indice generique",
      explicationDetaillee: "exp",
      contenu: {
        type: "T07",
        depart: "=SOMME(A1:A10",
        mode: "exact",
        versionsAcceptees: ["=SOMME(A1:A10)"],
        erreursPrevues: [{ valeur: "=SOMME(A1:A10))", indice: "Verifiez les parentheses." }],
      },
    };
    expect(corriger(ex, { type: "T07", saisie: "=SOMME(A1:A10)" }).juste).toBe(true);
    expect(corriger(ex, { type: "T07", saisie: "=SOMME(A1:A10))" }).indice).toMatch(/parentheses/);
    expect(corriger(ex, { type: "T07", saisie: "=TOTAL(A1:A10)" }).indice).toBe("indice generique");
  });

  it("code de validation : code juste sans casse ni espaces, erreur prevue (T10)", () => {
    const ex: Exercice = {
      identifiant: "X-T10",
      nature: "exercice",
      titre: "t",
      notionId: "n",
      filRougeId: null,
      dureeMinutes: 5,
      enonce: "q",
      images: [],
      collageAutorise: true,
      indiceGenerique: "indice generique",
      explicationDetaillee: "exp",
      contenu: {
        type: "T10",
        consigne: "Faites le TP puis saisissez le code.",
        lienTP: "https://exemple.fr/tp",
        codesAcceptes: ["MWINDA42"],
        erreursPrevues: [{ valeur: "TP1", indice: "Ce code est celui du TP precedent." }],
      },
    };
    expect(corriger(ex, { type: "T10", saisie: "mwinda 42" }).juste).toBe(true);
    expect(corriger(ex, { type: "T10", saisie: "TP1" }).indice).toMatch(/precedent/);
    expect(corriger(ex, { type: "T10", saisie: "ZZZ" }).indice).toBe("indice generique");
  });

  it("refuse une soumission d'un autre type que l'exercice", () => {
    const ex = recette("MACH-DEC-S08E03"); // T02
    expect(() => corriger(ex, { type: "T09", saisie: "6" })).toThrow();
  });
});
