import type { Exercice } from "./types";

// Interface du depot des exercices. Le domaine ne connait que cette interface.
// Une version en memoire sert aux tests, une version D1 sert en production.
export interface DepotExercices {
  creer(exercice: Exercice): Promise<void>;
  // Cree ou remplace l'exercice de meme identifiant (rechargement, EM-CON-07).
  remplacer(exercice: Exercice): Promise<void>;
  parIdentifiant(identifiant: string): Promise<Exercice | null>;
  tous(): Promise<Exercice[]>;
  existeIdentifiant(identifiant: string): Promise<boolean>;
  parNotion(notionId: string): Promise<Exercice[]>;
  nombreParNotion(notionId: string): Promise<number>;
  nombreParFilRouge(filRougeId: string): Promise<number>;
}
