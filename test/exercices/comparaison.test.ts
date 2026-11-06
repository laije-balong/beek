import { describe, it, expect } from "vitest";
import {
  comparer,
  correspondUne,
  lireNombre,
  comparerNombre,
  comparerCode,
} from "../../src/exercices/comparaison";

describe("comparaison des reponses (section 4.1, points 3.4c et 3.5)", () => {
  it("mode texte ignore casse, accents et espaces en trop", () => {
    expect(comparer("  SOMME ", "somme", "texte")).toBe(true);
    expect(comparer("Café", "cafe", "texte")).toBe(true);
    expect(comparer("petit  caillou", "petit caillou", "texte")).toBe(true);
    expect(comparer("compter", "caillou", "texte")).toBe(false);
  });

  it("mode exact ne tient compte que des espaces du debut et de la fin", () => {
    expect(comparer(" =SOMME ", "=SOMME", "exact")).toBe(true);
    expect(comparer("=somme", "=SOMME", "exact")).toBe(false);
  });

  it("mode pseudo-code tient les symboles equivalents et ignore les espaces autour (3.4c)", () => {
    expect(comparer("pages >= 100", "pages>=100", "pseudo-code")).toBe(true);
    expect(comparer("pages ≥ 100", "pages >= 100", "pseudo-code")).toBe(true);
    expect(comparer("x ≠ y", "x <> y", "pseudo-code")).toBe(true);
    expect(comparer("a ≤ b", "a<=b", "pseudo-code")).toBe(true);
    expect(comparer("SI x ALORS", "si x alors", "pseudo-code")).toBe(true);
  });

  it("correspondUne accepte une reponse parmi plusieurs", () => {
    expect(correspondUne("caillou", ["petit caillou", "caillou"], "texte")).toBe(true);
    expect(correspondUne("galet", ["petit caillou", "caillou"], "texte")).toBe(false);
  });

  it("lecture numerique : entier, decimal, binaire, hexadecimal, espaces ignores (3.5)", () => {
    expect(lireNombre("1 500", "entier")).toBe(1500);
    expect(lireNombre("1,5", "decimal")).toBe(1.5);
    expect(lireNombre("1.5", "decimal")).toBe(1.5);
    expect(lireNombre("FF", "hexadecimal")).toBe(255);
    expect(lireNombre("1101", "binaire")).toBe(13);
    expect(lireNombre("abc", "entier")).toBeNull();
  });

  it("comparerNombre tient 1500 et 1 500 pour egaux en entier (3.5)", () => {
    expect(comparerNombre("1 500", "1500", "entier")).toBe(true);
    expect(comparerNombre("1,50", "1.5", "decimal", 0.01)).toBe(true);
  });

  it("en binaire, 110 et 0110 ont la meme valeur, d'ou T02 exact pour 4 bits", () => {
    // T09 lit la valeur : 110 et 0110 sont egaux, le zero de gauche est perdu.
    expect(comparerNombre("110", "0110", "binaire")).toBe(true);
    // T02 mode exact distingue les deux ecritures.
    expect(comparer("110", "0110", "exact")).toBe(false);
  });

  it("comparerCode ignore majuscules et espaces (T10)", () => {
    expect(comparerCode("ab 12", "AB12")).toBe(true);
    expect(comparerCode("ab12", "AB13")).toBe(false);
  });
});
