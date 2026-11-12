import type { DepotCommentaires } from "./depot";
import type { Horloge } from "../comptes/temps";
import { debutJourBrazzaville } from "../comptes/temps";
import {
  ErreurCommentaire,
  LONGUEUR_MAX_COMMENTAIRE,
  MAX_CONSECUTIFS_SANS_REPONSE,
  MAX_PAR_JOUR,
  type Commentaire,
} from "./types";

// Echange sous un exercice (UC-05 A9, EM-AID-04). Le serveur controle les limites,
// et pas seulement la page, pour qu'aucun envoi en boucle n'epuise le quota
// d'ecriture (EM-AID-07). RG-31 : 500 caracteres au plus. RG-32 : 3 de suite sans
// reponse par apprenant et par exercice. RG-33 : 10 par jour et par apprenant.
export class ServiceCommentaires {
  readonly #depot: DepotCommentaires;
  readonly #horloge: Horloge;

  constructor(depot: DepotCommentaires, horloge: Horloge) {
    this.#depot = depot;
    this.#horloge = horloge;
  }

  // Commentaire d'un apprenant sur un exercice (UC-05 A9, A12 a A14).
  async publierApprenant(
    apprenantId: string,
    exerciceIdentifiant: string,
    texte: string
  ): Promise<Commentaire> {
    this.#verifierTexte(texte);
    const maintenant = this.#horloge.maintenant();
    // RG-33 : 10 par jour, tous exercices confondus (UC-05 A14).
    const nbJour = await this.#depot.nombreDeLApprenantDepuis(
      apprenantId,
      debutJourBrazzaville(maintenant)
    );
    if (nbJour >= MAX_PAR_JOUR) {
      throw new ErreurCommentaire(
        "Vous avez envoye 10 messages aujourd'hui. Reessayez demain."
      );
    }
    // RG-32 : 3 de suite sans reponse sur cet exercice (UC-05 A13).
    const fil = await this.#depot.fil(apprenantId, exerciceIdentifiant);
    if (consecutifsSansReponse(fil) >= MAX_CONSECUTIFS_SANS_REPONSE) {
      throw new ErreurCommentaire(
        "Vous avez envoye 3 messages sans reponse sur cet exercice. Attendez la reponse du formateur."
      );
    }
    return this.#creer(exerciceIdentifiant, apprenantId, "apprenant", texte, maintenant);
  }

  // Reponse du formateur dans le fil d'un apprenant. Sans limite en nombre, mais
  // la limite de longueur s'applique (RG-31, US-19 CA5).
  async publierFormateur(
    apprenantId: string,
    exerciceIdentifiant: string,
    texte: string
  ): Promise<Commentaire> {
    this.#verifierTexte(texte);
    return this.#creer(
      exerciceIdentifiant,
      apprenantId,
      "formateur",
      texte,
      this.#horloge.maintenant()
    );
  }

  // Fil d'un exercice pour un apprenant. Le masquage n'est pas encore gere : tout
  // le fil est visible (US-18 relevera le masquage).
  fil(apprenantId: string, exerciceIdentifiant: string): Promise<Commentaire[]> {
    return this.#depot.fil(apprenantId, exerciceIdentifiant);
  }

  // Fils distincts, pour que le formateur retrouve les echanges.
  fils(): Promise<{ apprenantId: string; exerciceIdentifiant: string }[]> {
    return this.#depot.fils();
  }

  #verifierTexte(texte: string): void {
    if (!texte || texte.trim().length === 0) {
      throw new ErreurCommentaire("Le commentaire est vide.");
    }
    if (texte.length > LONGUEUR_MAX_COMMENTAIRE) {
      throw new ErreurCommentaire("Un commentaire compte 500 caracteres au plus.");
    }
  }

  async #creer(
    exerciceIdentifiant: string,
    apprenantId: string,
    auteur: "apprenant" | "formateur",
    texte: string,
    date: number
  ): Promise<Commentaire> {
    const commentaire: Commentaire = {
      id: crypto.randomUUID(),
      exerciceIdentifiant,
      apprenantId,
      auteur,
      texte,
      date,
      masque: false,
    };
    await this.#depot.creer(commentaire);
    return commentaire;
  }
}

// Nombre de commentaires d'apprenant en fin de fil, sans reponse du formateur.
function consecutifsSansReponse(fil: Commentaire[]): number {
  let n = 0;
  for (let i = fil.length - 1; i >= 0; i--) {
    if (fil[i].auteur === "formateur") break;
    n++;
  }
  return n;
}
