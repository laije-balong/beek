import type { Commentaire } from "./types";

// Interface du depot des commentaires. Le domaine ne connait que cette interface.
export interface DepotCommentaires {
  creer(commentaire: Commentaire): Promise<void>;
  // Fil d'un exercice pour un apprenant, par date croissante.
  fil(apprenantId: string, exerciceIdentifiant: string): Promise<Commentaire[]>;
  // Nombre de commentaires ecrits par l'apprenant depuis une borne, pour le
  // compteur quotidien (RG-33).
  nombreDeLApprenantDepuis(apprenantId: string, borneMs: number): Promise<number>;
  // Fils distincts, pour la liste du formateur.
  fils(): Promise<{ apprenantId: string; exerciceIdentifiant: string }[]>;
}
