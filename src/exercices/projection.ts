// Projection publique d'un exercice, celle qui part vers le navigateur. Elle
// retire la reponse attendue, les indices et l'explication (EM-EXE-03, critere 7).
// Le navigateur ne recoit que de quoi afficher l'enonce et la zone de reponse.

import { enonceVersHtml } from "./enonce";
import type { Exercice, FormatCalcul, ImageExercice } from "./types";

export type ContenuPublic =
  | { type: "T01"; question: string; choixMultiple: boolean; melange: boolean; options: string[] }
  | { type: "T02"; question: string }
  | { type: "T03"; consigne: string; elements: { id: string; texte: string }[] }
  | {
      type: "T04";
      consigne: string;
      gauche: { id: string; texte: string }[];
      droite: { id: string; texte: string }[];
    }
  | { type: "T05"; texte: string; trous: { liste: boolean; choix?: string[] }[] }
  | { type: "T07"; depart: string }
  | { type: "T09"; question: string; unite?: string; format: FormatCalcul }
  | { type: "T10"; consigne: string; lienTP: string };

export interface ExercicePublic {
  identifiant: string;
  titre: string;
  enonceHtml: string; // enonce mis en forme, HTML sur (voir enonce.ts)
  dureeMinutes: number;
  collageAutorise: boolean;
  images: ImageExercice[];
  contenu: ContenuPublic;
}

function contenuPublic(contenu: Exercice["contenu"]): ContenuPublic {
  switch (contenu.type) {
    case "T01":
      return {
        type: "T01",
        question: contenu.question,
        choixMultiple: contenu.choixMultiple,
        melange: contenu.melange,
        options: contenu.options.map((o) => o.texte),
      };
    case "T02":
      return { type: "T02", question: contenu.question };
    case "T03":
      return {
        type: "T03",
        consigne: contenu.consigne,
        elements: contenu.elements.map((e) => ({ id: e.id, texte: e.texte })),
      };
    case "T04":
      return {
        type: "T04",
        consigne: contenu.consigne,
        gauche: contenu.gauche.map((g) => ({ id: g.id, texte: g.texte })),
        droite: contenu.droite.map((d) => ({ id: d.id, texte: d.texte })),
      };
    case "T05":
      return {
        type: "T05",
        texte: contenu.texte,
        trous: contenu.trous.map((t) => ({ liste: t.choix !== undefined, choix: t.choix })),
      };
    case "T07":
      return { type: "T07", depart: contenu.depart };
    case "T09":
      return { type: "T09", question: contenu.question, unite: contenu.unite, format: contenu.format };
    case "T10":
      return { type: "T10", consigne: contenu.consigne, lienTP: contenu.lienTP };
  }
}

export function projeter(exercice: Exercice): ExercicePublic {
  return {
    identifiant: exercice.identifiant,
    titre: exercice.titre,
    enonceHtml: enonceVersHtml(exercice.enonce),
    dureeMinutes: exercice.dureeMinutes,
    collageAutorise: exercice.collageAutorise,
    images: exercice.images,
    contenu: contenuPublic(exercice.contenu),
  };
}
