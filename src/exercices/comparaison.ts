// Comparaison d'une saisie a une reponse acceptee. Trois modes, section 4.1 du
// referentiel plus le mode pseudo-code (point 3.4c). Lecture numerique d'une
// saisie, a la maniere de T09 (points 3.5 et T09). Ce module sert a la correction
// et au controle numero 6 du referentiel.

import type { FormatCalcul, ModeComparaison } from "./types";

// Mode texte : minuscules, accents retires, espaces du debut et de la fin
// enleves, espaces repetes reduits a un seul.
function normaliserTexte(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

// Mode exact : seuls les espaces du debut et de la fin sont enleves.
function normaliserExact(s: string): string {
  return s.trim();
}

// Mode pseudo-code : applique le mode texte, tient "<>" et "≠", "<=" et "≤",
// ">=" et "≥" pour equivalents, et ignore les espaces autour des symboles.
function normaliserPseudoCode(s: string): string {
  // Unifie les symboles vers une forme ASCII avant la normalisation des accents.
  // Sinon la decomposition NFD casse "≠", qui devient "=" suivi d'un trait
  // combinant efface avec les accents.
  let t = s.replace(/≠/g, "<>").replace(/≤/g, "<=").replace(/≥/g, ">=");
  t = normaliserTexte(t);
  // Enleve les espaces autour des symboles d'affectation et de comparaison.
  t = t.replace(/\s*(<=|>=|<>|[←<>=+\-*/])\s*/g, "$1");
  return t;
}

function normaliser(s: string, mode: ModeComparaison): string {
  if (mode === "exact") return normaliserExact(s);
  if (mode === "pseudo-code") return normaliserPseudoCode(s);
  return normaliserTexte(s);
}

// Vrai si la saisie correspond a la reponse acceptee, selon le mode.
export function comparer(saisie: string, accepte: string, mode: ModeComparaison): boolean {
  return normaliser(saisie, mode) === normaliser(accepte, mode);
}

// Vrai si la saisie correspond a l'une des reponses acceptees.
export function correspondUne(
  saisie: string,
  acceptees: readonly string[],
  mode: ModeComparaison
): boolean {
  return acceptees.some((a) => comparer(saisie, a, mode));
}

// Lit une saisie comme un nombre, dans le format donne. Virgule ou point pour un
// decimal, espaces entre les chiffres ignores. Renvoie null si la saisie n'est
// pas un nombre valable dans ce format.
export function lireNombre(saisie: string, format: FormatCalcul): number | null {
  const net = saisie.replace(/\s+/g, "");
  if (net === "") return null;
  if (format === "binaire") {
    if (!/^[+-]?[01]+$/.test(net)) return null;
    return parseInt(net, 2);
  }
  if (format === "hexadecimal") {
    if (!/^[+-]?[0-9a-fA-F]+$/.test(net)) return null;
    return parseInt(net, 16);
  }
  if (format === "entier") {
    if (!/^[+-]?\d+$/.test(net)) return null;
    return parseInt(net, 10);
  }
  // decimal : virgule ou point.
  const avecPoint = net.replace(",", ".");
  if (!/^[+-]?\d+(\.\d+)?$/.test(avecPoint)) return null;
  return parseFloat(avecPoint);
}

// Vrai si la saisie, lue dans le format, egale la valeur attendue, a l'ecart
// admis pres pour un decimal.
export function comparerNombre(
  saisie: string,
  valeurAttendue: string,
  format: FormatCalcul,
  ecartAdmis = 0
): boolean {
  const a = lireNombre(saisie, format);
  const b = lireNombre(valeurAttendue, format);
  if (a === null || b === null) return false;
  return Math.abs(a - b) <= ecartAdmis;
}

// Comparaison d'un code de validation (T10) : sans majuscules ni espaces.
export function comparerCode(saisie: string, accepte: string): boolean {
  const n = (s: string) => s.replace(/\s+/g, "").toUpperCase();
  return n(saisie) === n(accepte);
}
