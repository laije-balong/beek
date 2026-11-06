export type Role = "formateur" | "apprenant";

export type StatutCompte =
  | "en-attente-activation"
  | "actif"
  | "bloque-temporairement"
  | "mot-de-passe-a-changer"
  | "desactive"
  | "anonymise";

export interface Consentement {
  seizeAns: boolean;
  traitementDonnees: boolean;
}

// Un code de secours du formateur, EM-ACC-13. Le code en clair n'est jamais
// stocke : seul son HMAC avec un sel propre l'est, avec son etat consomme.
export interface CodeDeSecours {
  sel: Uint8Array;
  verificateur: Uint8Array;
  consomme: boolean;
}

// Un compte, tel que le domaine le manipule. Les dates sont en millisecondes
// depuis l'epoque. Le sel et le verificateur sont des octets.
export interface Compte {
  id: string;
  nom: string;
  email: string;
  role: Role;
  statut: StatutCompte;
  sel: Uint8Array;
  verificateur: Uint8Array;
  expirationMotDePasseTemporaire: number | null;
  dateCreation: number;
  dateActivation: number | null;
  dateConsentement: number | null;
  echecsConnexion: number;
  finBlocage: number | null;
  statutAvantBlocage: StatutCompte | null;
  motsDePasseTemporairesDuJour: number;
  jourDesMotsDePasseTemporaires: string | null;
  // Codes de secours, non vides pour un formateur, EM-ACC-13.
  codesDeSecours: CodeDeSecours[];
}

export class ErreurCompte extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurCompte";
  }
}
