import type { Authentificateur } from "../auth/types";
import { genererSel, genererMotDePasseTemporaire } from "../auth/hachage-partage";
import type { DepotComptes } from "./depot";
import { type Compte, type Consentement, type Role, ErreurCompte } from "./types";
import { type Horloge, SEPT_JOURS, jourBrazzaville } from "./temps";

function estEmailValide(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Domaine des comptes. Ne connait que l'interface de depot et l'interface
// d'authentification, donc il ne depend ni de D1 ni d'une methode de hachage.
export class ServiceComptes {
  readonly #depot: DepotComptes;
  readonly #auth: Authentificateur;
  readonly #horloge: Horloge;

  constructor(depot: DepotComptes, auth: Authentificateur, horloge: Horloge) {
    this.#depot = depot;
    this.#auth = auth;
    this.#horloge = horloge;
  }

  // Le formateur cree un compte. Beek genere un mot de passe temporaire, stocke
  // son verificateur, et le renvoie une seule fois pour le coupon.
  async creerCompte(
    nom: string,
    email: string,
    role: Role = "apprenant"
  ): Promise<{ compte: Compte; motDePasseTemporaire: string }> {
    const emailNorm = email.trim().toLowerCase();
    if (!estEmailValide(emailNorm)) {
      throw new ErreurCompte("adresse invalide");
    }
    if (await this.#depot.parEmail(emailNorm)) {
      throw new ErreurCompte("adresse deja utilisee par un autre apprenant");
    }
    const sel = genererSel();
    const temp = genererMotDePasseTemporaire();
    const verificateur = await this.#auth.preparerVerificateurSecret(temp, sel);
    const maintenant = this.#horloge.maintenant();
    const compte: Compte = {
      id: crypto.randomUUID(),
      nom: nom.trim(),
      email: emailNorm,
      role,
      statut: "en-attente-activation",
      sel,
      verificateur,
      expirationMotDePasseTemporaire: maintenant + SEPT_JOURS,
      dateCreation: maintenant,
      dateActivation: null,
      dateConsentement: null,
      echecsConnexion: 0,
      finBlocage: null,
      motsDePasseTemporairesDuJour: 1,
      jourDesMotsDePasseTemporaires: jourBrazzaville(maintenant),
    };
    await this.#depot.creer(compte);
    return { compte, motDePasseTemporaire: temp };
  }

  // L'apprenant active son compte. Il saisit le mot de passe temporaire, choisit
  // son mot de passe, et donne son consentement. Le sel du compte est reutilise
  // pour le mot de passe choisi, le navigateur l'a utilise pour son calcul.
  async activer(
    email: string,
    motDePasseTemporaire: string,
    nouveauResultatNavigateur: Uint8Array,
    consentement: Consentement
  ): Promise<void> {
    const compte = await this.#depot.parEmail(email.trim().toLowerCase());
    if (!compte) {
      throw new ErreurCompte("compte introuvable");
    }
    if (compte.statut !== "en-attente-activation") {
      throw new ErreurCompte("compte non activable");
    }
    const maintenant = this.#horloge.maintenant();
    if (
      compte.expirationMotDePasseTemporaire !== null &&
      maintenant > compte.expirationMotDePasseTemporaire
    ) {
      throw new ErreurCompte("mot de passe temporaire expire");
    }
    const ok = await this.#auth.verifierSecret(
      motDePasseTemporaire,
      compte.sel,
      compte.verificateur
    );
    if (!ok) {
      throw new ErreurCompte("mot de passe temporaire incorrect");
    }
    if (!consentement.seizeAns || !consentement.traitementDonnees) {
      throw new ErreurCompte("consentement requis");
    }
    compte.verificateur = await this.#auth.preparerVerificateur(nouveauResultatNavigateur);
    compte.statut = "actif";
    compte.dateActivation = maintenant;
    compte.dateConsentement = maintenant;
    compte.expirationMotDePasseTemporaire = null;
    await this.#depot.mettreAJour(compte);
  }
}
