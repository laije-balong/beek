import type { DepotAttributions } from "./depot-attribution";
import type { Attribution, ProgressionElement } from "./types";

const COMMENCE = ["en-cours", "reussi", "reussi-avec-explication"];

// Depot des attributions et progressions en memoire, pour les tests.
export class DepotAttributionsMemoire implements DepotAttributions {
  readonly #attributions = new Map<string, Attribution>();
  readonly #progressions = new Map<string, ProgressionElement>();

  async creerAttribution(attribution: Attribution): Promise<void> {
    this.#attributions.set(attribution.id, structuredClone(attribution));
  }
  async attributionParApprenantEtProgramme(
    apprenantId: string,
    programmeId: string
  ): Promise<Attribution | null> {
    for (const a of this.#attributions.values())
      if (a.apprenantId === apprenantId && a.programmeId === programmeId)
        return structuredClone(a);
    return null;
  }
  async attributionsDeLApprenant(apprenantId: string): Promise<Attribution[]> {
    return [...this.#attributions.values()]
      .filter((a) => a.apprenantId === apprenantId)
      .map((a) => structuredClone(a));
  }

  async creerProgression(progression: ProgressionElement): Promise<void> {
    this.#progressions.set(progression.id, structuredClone(progression));
  }
  async progressionsDeLAttribution(attributionId: string): Promise<ProgressionElement[]> {
    return [...this.#progressions.values()]
      .filter((p) => p.attributionId === attributionId)
      .map((p) => structuredClone(p));
  }
  async progressionParElement(
    attributionId: string,
    elementId: string
  ): Promise<ProgressionElement | null> {
    for (const p of this.#progressions.values())
      if (p.attributionId === attributionId && p.elementId === elementId)
        return structuredClone(p);
    return null;
  }
  async nombreApprenantsAyantCommence(elementId: string): Promise<number> {
    return [...this.#progressions.values()].filter(
      (p) => p.elementId === elementId && COMMENCE.includes(p.statut)
    ).length;
  }
  async mettreAJourProgression(progression: ProgressionElement): Promise<void> {
    this.#progressions.set(progression.id, structuredClone(progression));
  }
}
