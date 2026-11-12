// Commentaire sous un exercice (EM-AID-04). L'echange est entre un apprenant et le
// formateur, sur un exercice. Seuls eux deux le voient (UC-05 A9). Un commentaire
// ne porte que du texte, sans piece jointe (RG-31).

export type AuteurCommentaire = "apprenant" | "formateur";

export interface Commentaire {
  id: string;
  exerciceIdentifiant: string;
  apprenantId: string;
  auteur: AuteurCommentaire;
  texte: string;
  date: number;
  masque: boolean; // US-18, masquage pas encore gere : toujours false pour l'instant
}

// RG-31 : 500 caracteres au plus, pour l'apprenant comme pour le formateur.
export const LONGUEUR_MAX_COMMENTAIRE = 500;
// RG-32 : 3 commentaires de suite sans reponse, par apprenant et par exercice.
export const MAX_CONSECUTIFS_SANS_REPONSE = 3;
// RG-33 : 10 commentaires par jour, par apprenant, tous exercices confondus.
export const MAX_PAR_JOUR = 10;

export class ErreurCommentaire extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurCommentaire";
  }
}
