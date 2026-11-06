// Modele de donnees d'un exercice, selon la section 3 du referentiel et le
// contenu propre a chaque type de la section 5. Les exercices sont ecrits comme
// des donnees, un par entree, hors du code des pages (demande 3.1 du porteur).
// La reponse attendue, les indices et l'explication restent dans ces donnees,
// cote serveur. La projection vers le navigateur, qui retire la reponse attendue
// et l'explication non debloquee, se fera au rendu de l'exercice (EM-EXE-03).

export type TypeExercice =
  | "T01"
  | "T02"
  | "T03"
  | "T04"
  | "T05"
  | "T06"
  | "T07"
  | "T08"
  | "T09"
  | "T10";

export type NatureExercice = "exercice" | "etape-de-defi";

// Modes de comparaison d'une saisie, section 4.1 plus le mode pseudo-code
// demande au point 3.4.
export type ModeComparaison = "texte" | "exact" | "pseudo-code";

export type FormatCalcul = "entier" | "decimal" | "binaire" | "hexadecimal";

export type FormatImage = "webp" | "png" | "svg";

export const TAILLE_IMAGE_MAX = 200 * 1024;

// Limites PR-06, citees par le referentiel pour T01 et T03.
export const T01_OPTIONS_MIN = 2;
export const T01_OPTIONS_MAX = 6;
export const T03_ELEMENTS_MIN = 3;
export const T03_ELEMENTS_MAX = 10;

// Marque d'un trou dans le texte de T05. Le nombre de marques egale le nombre de
// trous decrits.
export const MARQUE_TROU = "[[trou]]";

export interface ImageExercice {
  cle: string; // cle dans Workers KV
  octets: number;
  format: FormatImage;
  texteAlternatif: string;
}

// Lecture d'une saisie comme un nombre, a la maniere de T09 (point 3.5).
export interface LectureNumerique {
  format: FormatCalcul;
  ecartAdmis?: number;
}

export interface OptionT01 {
  texte: string;
  correcte: boolean;
  indice?: string; // indice cible, pour une option fausse cochee
}

export interface ElementT03 {
  id: string;
  texte: string;
  indice?: string;
}

export interface ElementT04 {
  id: string;
  texte: string;
}

export interface PaireT04 {
  gaucheId: string;
  droiteId: string;
}

export interface TrouT05 {
  reponsesAcceptees: string[];
  mode: ModeComparaison;
  choix?: string[]; // liste deroulante, en option
  lectureNumerique?: LectureNumerique;
  indice?: string;
}

// Erreur prevue : une saisie fausse anticipee et son indice cible (T02, T07, T09, T10).
export interface ReponsePrevue {
  valeur: string;
  indice: string;
}

export type ContenuExercice =
  | {
      type: "T01";
      question: string;
      choixMultiple: boolean;
      melange: boolean;
      options: OptionT01[];
    }
  | {
      type: "T02";
      question: string;
      mode: ModeComparaison;
      reponsesAcceptees: string[];
      lectureNumerique?: LectureNumerique;
      erreursPrevues: ReponsePrevue[];
    }
  | {
      type: "T03";
      consigne: string;
      elements: ElementT03[];
      ordresAcceptes: string[][]; // chaque ordre est une liste d'identifiants d'elements
    }
  | {
      type: "T04";
      consigne: string;
      gauche: ElementT04[];
      droite: ElementT04[]; // peut contenir des intrus sans paire
      paires: PaireT04[];
      indicesGauche: Record<string, string>; // indice par element de gauche
    }
  | {
      type: "T05";
      texte: string; // contient MARQUE_TROU pour chaque trou, dans l'ordre
      trous: TrouT05[];
    }
  | {
      type: "T07";
      depart: string; // code ou texte avec son erreur
      mode: ModeComparaison;
      versionsAcceptees: string[];
      erreursPrevues: ReponsePrevue[];
    }
  | {
      type: "T09";
      question: string;
      valeurAttendue: string;
      format: FormatCalcul;
      ecartAdmis?: number;
      unite?: string;
      erreursPrevues: ReponsePrevue[];
    }
  | {
      type: "T10";
      consigne: string;
      lienTP: string;
      codesAcceptes: string[];
      erreursPrevues: ReponsePrevue[];
    };

// Un exercice complet : les champs communs de la section 3 et le contenu du type.
export interface Exercice {
  identifiant: string;
  nature: NatureExercice;
  titre: string;
  notionId: string;
  filRougeId: string | null;
  dureeMinutes: number;
  enonce: string;
  images: ImageExercice[];
  collageAutorise: boolean;
  indiceGenerique: string;
  explicationDetaillee: string;
  contenu: ContenuExercice;
}
