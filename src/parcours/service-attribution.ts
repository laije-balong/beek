import type { DepotAttributions } from "./depot-attribution";
import type { DepotProgrammes } from "./depot";
import type { DepotComptes } from "../comptes/depot";
import type { Horloge } from "../comptes/temps";
import {
  ErreurParcours,
  type Attribution,
  type ProgressionElement,
  type StatutElement,
} from "./types";

// Attribution d'un programme a un apprenant (UC-04). Elle cree l'attribution et
// la progression de chaque element : disponible pour le point de depart,
// verrouille pour les suivants, passe par le formateur pour les precedents
// (annexe B.2, PS-03).
export class ServiceAttributions {
  readonly #attributions: DepotAttributions;
  readonly #programmes: DepotProgrammes;
  readonly #comptes: DepotComptes;
  readonly #horloge: Horloge;

  constructor(
    attributions: DepotAttributions,
    programmes: DepotProgrammes,
    comptes: DepotComptes,
    horloge: Horloge
  ) {
    this.#attributions = attributions;
    this.#programmes = programmes;
    this.#comptes = comptes;
    this.#horloge = horloge;
  }

  async attribuer(
    apprenantId: string,
    programmeId: string,
    elementDepartId?: string
  ): Promise<Attribution> {
    const compte = await this.#comptes.parId(apprenantId);
    if (!compte || compte.role !== "apprenant") {
      throw new ErreurParcours("apprenant introuvable");
    }
    const programme = await this.#programmes.programmeParId(programmeId);
    if (!programme) throw new ErreurParcours("programme introuvable");
    // UC-04 A3 : un programme deja attribue a cet apprenant est refuse.
    if (await this.#attributions.attributionParApprenantEtProgramme(apprenantId, programmeId)) {
      throw new ErreurParcours("programme deja attribue a cet apprenant");
    }
    const elements = await this.#programmes.elementsDuProgramme(programmeId);
    const departId = elementDepartId ?? elements[0]?.id ?? null;
    if (elementDepartId && !elements.some((e) => e.id === elementDepartId)) {
      throw new ErreurParcours("element de depart inconnu");
    }

    const maintenant = this.#horloge.maintenant();
    const attribution: Attribution = {
      id: crypto.randomUUID(),
      apprenantId,
      programmeId,
      date: maintenant,
    };
    await this.#attributions.creerAttribution(attribution);

    const departIndex = elements.findIndex((e) => e.id === departId);
    for (let i = 0; i < elements.length; i++) {
      let statut: StatutElement;
      if (i < departIndex) statut = "passe-par-le-formateur";
      else if (i === departIndex) statut = "disponible";
      else statut = "verrouille";
      const progression: ProgressionElement = {
        id: crypto.randomUUID(),
        attributionId: attribution.id,
        elementId: elements[i].id,
        statut,
        reponsesFausses: 0,
        dateExplication: null,
        xpGagnes: false,
        dateOuverture: null,
        dateFin: null,
        tempsPasseMs: 0,
      };
      await this.#attributions.creerProgression(progression);
    }
    return attribution;
  }

  attributionsDeLApprenant(apprenantId: string): Promise<Attribution[]> {
    return this.#attributions.attributionsDeLApprenant(apprenantId);
  }
  progressionsDeLAttribution(attributionId: string): Promise<ProgressionElement[]> {
    return this.#attributions.progressionsDeLAttribution(attributionId);
  }
}
