// Correction d'une reponse d'apprenant, cote serveur (UC-05). Elle rend juste ou
// faux et, si faux, l'indice a afficher, cible si l'erreur etait prevue, generique
// sinon (section 4.2). Elle ne renvoie jamais la reponse attendue ni l'explication
// (EM-EXE-03). Le deblocage de l'explication apres trois fautes (section 4.3) est
// gere par l'appelant, qui compte les tentatives.

import {
  comparer,
  correspondUne,
  comparerNombre,
  comparerCode,
} from "./comparaison";
import type { Exercice } from "./types";

// Reponse soumise, selon le type de l'exercice.
export type Soumission =
  | { type: "T01"; optionsCochees: number[] }
  | { type: "T02"; saisie: string }
  | { type: "T03"; ordre: string[] }
  | { type: "T04"; paires: { gaucheId: string; droiteId: string }[] }
  | { type: "T05"; trous: string[] }
  | { type: "T07"; saisie: string }
  | { type: "T09"; saisie: string }
  | { type: "T10"; saisie: string };

export interface Resultat {
  juste: boolean;
  indice: string | null; // null si juste
}

function faux(indice: string): Resultat {
  return { juste: false, indice };
}
const JUSTE: Resultat = { juste: true, indice: null };

// Corrige une soumission. Le type de la soumission doit correspondre a celui de
// l'exercice.
export function corriger(exercice: Exercice, soumission: Soumission): Resultat {
  const contenu = exercice.contenu;
  const generique = exercice.indiceGenerique;
  if (contenu.type !== soumission.type) {
    throw new Error("le type de la soumission ne correspond pas a l'exercice");
  }

  switch (contenu.type) {
    case "T01": {
      if (soumission.type !== "T01") break;
      const cochees = new Set(soumission.optionsCochees);
      const correctes = new Set(
        contenu.options.map((o, i) => (o.correcte ? i : -1)).filter((i) => i >= 0)
      );
      const juste =
        cochees.size === correctes.size && [...cochees].every((i) => correctes.has(i));
      if (juste) return JUSTE;
      // Premiere option fausse cochee, dans l'ordre du fichier.
      for (let i = 0; i < contenu.options.length; i++) {
        if (cochees.has(i) && !contenu.options[i].correcte) {
          return faux(contenu.options[i].indice ?? generique);
        }
      }
      return faux(generique);
    }
    case "T02": {
      if (soumission.type !== "T02") break;
      const s = soumission.saisie;
      const ok =
        correspondUne(s, contenu.reponsesAcceptees, contenu.mode) ||
        (contenu.lectureNumerique !== undefined &&
          contenu.reponsesAcceptees.some((r) =>
            comparerNombre(s, r, contenu.lectureNumerique!.format, contenu.lectureNumerique!.ecartAdmis)
          ));
      if (ok) return JUSTE;
      for (const e of contenu.erreursPrevues) {
        const correspond =
          comparer(s, e.valeur, contenu.mode) ||
          (contenu.lectureNumerique !== undefined &&
            comparerNombre(s, e.valeur, contenu.lectureNumerique.format, contenu.lectureNumerique.ecartAdmis));
        if (correspond) return faux(e.indice);
      }
      return faux(generique);
    }
    case "T03": {
      if (soumission.type !== "T03") break;
      const ordre = soumission.ordre;
      const juste = contenu.ordresAcceptes.some(
        (a) => a.length === ordre.length && a.every((v, i) => v === ordre[i])
      );
      if (juste) return JUSTE;
      // Premier element mal place, par rapport au premier ordre accepte.
      const reference = contenu.ordresAcceptes[0];
      for (let i = 0; i < ordre.length; i++) {
        if (ordre[i] !== reference[i]) {
          const element = contenu.elements.find((e) => e.id === ordre[i]);
          return faux(element?.indice ?? generique);
        }
      }
      return faux(generique);
    }
    case "T04": {
      if (soumission.type !== "T04") break;
      const attendue = new Map(contenu.paires.map((p) => [p.gaucheId, p.droiteId]));
      const proposee = new Map(soumission.paires.map((p) => [p.gaucheId, p.droiteId]));
      const juste =
        attendue.size === proposee.size &&
        [...attendue].every(([g, d]) => proposee.get(g) === d);
      if (juste) return JUSTE;
      // Premier element de gauche mal associe, dans l'ordre du fichier.
      for (const g of contenu.gauche) {
        if (proposee.get(g.id) !== attendue.get(g.id)) {
          return faux(contenu.indicesGauche[g.id] ?? generique);
        }
      }
      return faux(generique);
    }
    case "T05": {
      if (soumission.type !== "T05") break;
      for (let i = 0; i < contenu.trous.length; i++) {
        const trou = contenu.trous[i];
        const saisie = soumission.trous[i] ?? "";
        const ok =
          correspondUne(saisie, trou.reponsesAcceptees, trou.mode) ||
          (trou.lectureNumerique !== undefined &&
            trou.reponsesAcceptees.some((r) =>
              comparerNombre(saisie, r, trou.lectureNumerique!.format, trou.lectureNumerique!.ecartAdmis)
            ));
        if (!ok) return faux(trou.indice ?? generique);
      }
      return JUSTE;
    }
    case "T07": {
      if (soumission.type !== "T07") break;
      if (correspondUne(soumission.saisie, contenu.versionsAcceptees, contenu.mode)) return JUSTE;
      for (const e of contenu.erreursPrevues)
        if (comparer(soumission.saisie, e.valeur, contenu.mode)) return faux(e.indice);
      return faux(generique);
    }
    case "T09": {
      if (soumission.type !== "T09") break;
      if (comparerNombre(soumission.saisie, contenu.valeurAttendue, contenu.format, contenu.ecartAdmis))
        return JUSTE;
      for (const e of contenu.erreursPrevues)
        if (comparerNombre(soumission.saisie, e.valeur, contenu.format, contenu.ecartAdmis))
          return faux(e.indice);
      return faux(generique);
    }
    case "T10": {
      if (soumission.type !== "T10") break;
      if (contenu.codesAcceptes.some((c) => comparerCode(soumission.saisie, c))) return JUSTE;
      for (const e of contenu.erreursPrevues)
        if (comparerCode(soumission.saisie, e.valeur)) return faux(e.indice);
      return faux(generique);
    }
  }
  throw new Error("type d'exercice non pris en charge par la correction");
}
