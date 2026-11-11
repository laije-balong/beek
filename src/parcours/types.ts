// Programme et elements de programme (US-07, annexe D). Un programme ordonne des
// exercices d'une filiere, avec au plus un fil rouge. Les defis viendront plus
// tard ; pour l'instant un element designe un exercice de nature "exercice".

export interface Programme {
  id: string;
  nom: string;
  filiereId: string;
  filRougeId: string | null;
}

export interface ElementProgramme {
  id: string;
  programmeId: string;
  position: number;
  exerciceIdentifiant: string;
}

// Statut d'un element de programme pour un apprenant (annexe B.2). Les trois
// derniers forment le "termine" du glossaire.
export type StatutElement =
  | "verrouille"
  | "disponible"
  | "en-cours"
  | "reussi"
  | "reussi-avec-explication"
  | "passe-par-le-formateur";

// Les statuts qui comptent comme termine (annexe B.2).
export const STATUTS_TERMINE: StatutElement[] = [
  "reussi",
  "reussi-avec-explication",
  "passe-par-le-formateur",
];

export interface Attribution {
  id: string;
  apprenantId: string;
  programmeId: string;
  date: number;
}

// Progression d'un apprenant sur un element d'un programme (annexe D).
export interface ProgressionElement {
  id: string;
  attributionId: string;
  elementId: string;
  statut: StatutElement;
  reponsesFausses: number;
  dateExplication: number | null;
  xpGagnes: boolean;
  dateOuverture: number | null;
  dateFin: number | null;
  tempsPasseMs: number;
}

export class ErreurParcours extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurParcours";
  }
}
