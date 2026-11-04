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
  motsDePasseTemporairesDuJour: number;
  jourDesMotsDePasseTemporaires: string | null;
}

export class ErreurCompte extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurCompte";
  }
}
