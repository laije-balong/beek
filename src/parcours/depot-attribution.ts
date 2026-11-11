import type { Attribution, ProgressionElement } from "./types";

// Interface du depot des attributions et des progressions.
export interface DepotAttributions {
  creerAttribution(attribution: Attribution): Promise<void>;
  attributionParApprenantEtProgramme(
    apprenantId: string,
    programmeId: string
  ): Promise<Attribution | null>;
  attributionsDeLApprenant(apprenantId: string): Promise<Attribution[]>;

  creerProgression(progression: ProgressionElement): Promise<void>;
  progressionsDeLAttribution(attributionId: string): Promise<ProgressionElement[]>;
  progressionParElement(
    attributionId: string,
    elementId: string
  ): Promise<ProgressionElement | null>;
  // Nombre d'apprenants qui ont commence un element, pour la garde US-07 CA6.
  nombreApprenantsAyantCommence(elementId: string): Promise<number>;
  mettreAJourProgression(progression: ProgressionElement): Promise<void>;
}
