// Taxonomie du contenu : domaine, filiere, niveau, notion. Modele de l'annexe D
// de la specification. Les trois niveaux d'une filiere sont crees d'office et ne
// se modifient pas (US-05 CA1 et CA3, PS-12). Les noms des niveaux portent leurs
// accents, car ils sont fixes par la specification et serviront au controle des
// imports.

export const NOMS_NIVEAUX = ["Découverte", "Fondamentaux", "Intermédiaire"] as const;
export type NomNiveau = (typeof NOMS_NIVEAUX)[number];

export interface Domaine {
  id: string;
  nom: string;
  ordre: number;
}

export interface Filiere {
  id: string;
  nom: string;
  ordre: number;
  domaineId: string;
}

export interface Niveau {
  id: string;
  nom: NomNiveau;
  ordre: number;
  filiereId: string;
}

export interface Notion {
  id: string;
  nom: string;
  ordre: number;
  niveauId: string;
}

export class ErreurContenu extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurContenu";
  }
}
