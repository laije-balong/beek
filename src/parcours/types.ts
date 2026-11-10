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

export class ErreurParcours extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurParcours";
  }
}
