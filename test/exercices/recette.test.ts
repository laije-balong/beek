import { describe, it, expect } from "vitest";
import { EXERCICES_RECETTE } from "../../src/exercices/donnees/recette";
import { controlesCoherence, messageErreur } from "../../src/exercices/controles";
import { comparer, comparerNombre } from "../../src/exercices/comparaison";

describe("exercices de la recette (3.7)", () => {
  it("les cinq exercices passent les controles de coherence du referentiel", () => {
    for (const ex of EXERCICES_RECETTE) {
      const erreurs = controlesCoherence(ex);
      expect(erreurs.map(messageErreur)).toEqual([]);
    }
    expect(EXERCICES_RECETTE).toHaveLength(5);
  });

  it("les identifiants sont uniques", () => {
    const ids = EXERCICES_RECETTE.map((e) => e.identifiant);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("le binaire sur 4 bits exige le zero de gauche (T02 exact)", () => {
    const ex = EXERCICES_RECETTE.find((e) => e.identifiant === "MACH-DEC-S08E03")!;
    if (ex.contenu.type !== "T02") throw new Error("type attendu T02");
    // La bonne reponse passe, la forme sans zero de gauche est refusee.
    expect(comparer("0110", ex.contenu.reponsesAcceptees[0], "exact")).toBe(true);
    expect(comparer("110", ex.contenu.reponsesAcceptees[0], "exact")).toBe(false);
  });

  it("la condition de la remise accepte ≥ et >= (T05 pseudo-code)", () => {
    const ex = EXERCICES_RECETTE.find((e) => e.identifiant === "LOGI-DEC-S09E04")!;
    if (ex.contenu.type !== "T05") throw new Error("type attendu T05");
    const attendu = ex.contenu.trous[0].reponsesAcceptees[0];
    expect(comparer("≥", attendu, "pseudo-code")).toBe(true);
    expect(comparer(">=", attendu, "pseudo-code")).toBe(true);
    expect(comparer(">", attendu, "pseudo-code")).toBe(false);
  });

  it("le calcul a trois resultats lit les montants comme des nombres (3.5)", () => {
    const ex = EXERCICES_RECETTE.find((e) => e.identifiant === "LOGI-DEC-S06E05")!;
    if (ex.contenu.type !== "T05") throw new Error("type attendu T05");
    const total = ex.contenu.trous[2];
    // "1 800" avec un espace est lu comme 1800.
    expect(comparerNombre("1 800", total.reponsesAcceptees[0], "entier")).toBe(true);
  });
});
