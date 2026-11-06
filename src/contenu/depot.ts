import type { Domaine, Filiere, Niveau, Notion } from "./types";

// Interface du depot de la taxonomie. Le domaine ne connait que cette interface.
// Une version en memoire sert aux tests, une version D1 sert en production.
export interface DepotContenu {
  creerDomaine(domaine: Domaine): Promise<void>;
  domaineParId(id: string): Promise<Domaine | null>;
  domaineParNom(nom: string): Promise<Domaine | null>;
  domaines(): Promise<Domaine[]>;

  // La filiere et ses trois niveaux sont crees ensemble.
  creerFiliereAvecNiveaux(filiere: Filiere, niveaux: Niveau[]): Promise<void>;
  filiereParId(id: string): Promise<Filiere | null>;
  filiereParNomDansDomaine(domaineId: string, nom: string): Promise<Filiere | null>;
  filieresDuDomaine(domaineId: string): Promise<Filiere[]>;
  niveauParId(id: string): Promise<Niveau | null>;
  niveauxDeFiliere(filiereId: string): Promise<Niveau[]>;

  creerNotion(notion: Notion): Promise<void>;
  notionParId(id: string): Promise<Notion | null>;
  notionParNomDansNiveau(niveauId: string, nom: string): Promise<Notion | null>;
  notionsDuNiveau(niveauId: string): Promise<Notion[]>;
  supprimerNotion(id: string): Promise<void>;
  // Nombre d'exercices rattaches a une notion, pour la garde de suppression,
  // US-05 CA4. Vaut zero tant que les exercices n'existent pas (iteration 3).
  nombreExercicesDeNotion(notionId: string): Promise<number>;
}
