import type { Authentificateur } from "../auth/types";
import { genererSel, genererMotDePasseTemporaire } from "../auth/hachage-partage";
import type { DepotComptes } from "./depot";
import { type Compte, type Consentement, type Role, ErreurCompte } from "./types";
import {
  type Horloge,
  SEPT_JOURS,
  QUINZE_MINUTES,
  jourBrazzaville,
} from "./temps";

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
  // son verificateur, et le renvoie une seule fois pour le coupon. Ce mot de
  // passe de creation ne compte pas dans le plafond RG-29.
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
      statutAvantBlocage: null,
      motsDePasseTemporairesDuJour: 0,
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

  // Connexion d'un compte actif avec le resultat du hachage du navigateur.
  // Bloque le compte 15 minutes apres 5 echecs consecutifs, RG-06.
  async connexion(email: string, resultatNavigateur: Uint8Array): Promise<Compte> {
    const compte = await this.#depot.parEmail(email.trim().toLowerCase());
    if (!compte) {
      throw new ErreurCompte("identifiants refuses");
    }
    const maintenant = this.#horloge.maintenant();

    // Deblocage automatique quand les 15 minutes sont passees.
    if (
      compte.statut === "bloque-temporairement" &&
      compte.finBlocage !== null &&
      maintenant >= compte.finBlocage
    ) {
      compte.statut = compte.statutAvantBlocage ?? "actif";
      compte.statutAvantBlocage = null;
      compte.finBlocage = null;
      compte.echecsConnexion = 0;
      await this.#depot.mettreAJour(compte);
    }

    if (compte.statut === "bloque-temporairement") {
      throw new ErreurCompte("compte bloque temporairement");
    }
    if (compte.statut !== "actif") {
      throw new ErreurCompte("connexion impossible pour ce compte");
    }

    const ok = await this.#auth.verifier(resultatNavigateur, compte.verificateur);
    if (!ok) {
      compte.echecsConnexion += 1;
      if (compte.echecsConnexion >= 5) {
        compte.statutAvantBlocage = compte.statut;
        compte.statut = "bloque-temporairement";
        compte.finBlocage = maintenant + QUINZE_MINUTES;
      }
      await this.#depot.mettreAJour(compte);
      throw new ErreurCompte("identifiants refuses");
    }

    compte.echecsConnexion = 0;
    await this.#depot.mettreAJour(compte);
    return compte;
  }

  // Le formateur reinitialise le mot de passe. Beek genere un nouveau mot de
  // passe temporaire, dans la limite de 5 par jour et par compte, RG-29. La
  // reinitialisation leve le blocage, PS-10.
  async reinitialiser(email: string): Promise<{ compte: Compte; motDePasseTemporaire: string }> {
    const compte = await this.#depot.parEmail(email.trim().toLowerCase());
    if (!compte) {
      throw new ErreurCompte("compte introuvable");
    }
    const maintenant = this.#horloge.maintenant();
    const jour = jourBrazzaville(maintenant);
    if (compte.jourDesMotsDePasseTemporaires !== jour) {
      compte.jourDesMotsDePasseTemporaires = jour;
      compte.motsDePasseTemporairesDuJour = 0;
    }
    if (compte.motsDePasseTemporairesDuJour >= 5) {
      throw new ErreurCompte("limite de reinitialisations atteinte");
    }
    const temp = genererMotDePasseTemporaire();
    compte.verificateur = await this.#auth.preparerVerificateurSecret(temp, compte.sel);
    compte.expirationMotDePasseTemporaire = maintenant + SEPT_JOURS;
    compte.motsDePasseTemporairesDuJour += 1;
    compte.echecsConnexion = 0;
    compte.finBlocage = null;
    compte.statutAvantBlocage = null;
    compte.statut =
      compte.statut === "en-attente-activation" ? "en-attente-activation" : "mot-de-passe-a-changer";
    await this.#depot.mettreAJour(compte);
    return { compte, motDePasseTemporaire: temp };
  }

  // Apres une reinitialisation, l'apprenant saisit le mot de passe temporaire et
  // choisit son nouveau mot de passe. Le consentement a deja ete donne.
  async changerMotDePasse(
    email: string,
    motDePasseTemporaire: string,
    nouveauResultatNavigateur: Uint8Array
  ): Promise<void> {
    const compte = await this.#depot.parEmail(email.trim().toLowerCase());
    if (!compte) {
      throw new ErreurCompte("compte introuvable");
    }
    if (compte.statut !== "mot-de-passe-a-changer") {
      throw new ErreurCompte("aucun changement de mot de passe requis");
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
    compte.verificateur = await this.#auth.preparerVerificateur(nouveauResultatNavigateur);
    compte.statut = "actif";
    compte.expirationMotDePasseTemporaire = null;
    await this.#depot.mettreAJour(compte);
  }

  // Sel a renvoyer avant une connexion. Le sel du compte s'il existe, un sel
  // fictif stable sinon, pour ne pas reveler quelles adresses ont un compte.
  async selPourConnexion(email: string): Promise<Uint8Array> {
    const emailNorm = email.trim().toLowerCase();
    const compte = await this.#depot.parEmail(emailNorm);
    return this.#auth.selPourAdresse(emailNorm, compte ? compte.sel : null);
  }
}
