import type { DepotProgrammes } from "./depot";
import type { ElementProgramme, Programme } from "./types";

// Depot des programmes en memoire, pour les tests.
export class DepotProgrammesMemoire implements DepotProgrammes {
  readonly #programmes = new Map<string, Programme>();
  readonly #elements = new Map<string, ElementProgramme>();

  async creerProgramme(programme: Programme): Promise<void> {
    this.#programmes.set(programme.id, structuredClone(programme));
  }
  async programmeParId(id: string): Promise<Programme | null> {
    const p = this.#programmes.get(id);
    return p ? structuredClone(p) : null;
  }
  async programmes(): Promise<Programme[]> {
    return [...this.#programmes.values()].map((p) => structuredClone(p));
  }

  async ajouterElement(element: ElementProgramme): Promise<void> {
    this.#elements.set(element.id, structuredClone(element));
  }
  async elementParId(id: string): Promise<ElementProgramme | null> {
    const e = this.#elements.get(id);
    return e ? structuredClone(e) : null;
  }
  async elementsDuProgramme(programmeId: string): Promise<ElementProgramme[]> {
    return [...this.#elements.values()]
      .filter((e) => e.programmeId === programmeId)
      .sort((a, b) => a.position - b.position)
      .map((e) => structuredClone(e));
  }
  async retirerElement(id: string): Promise<void> {
    this.#elements.delete(id);
  }
  async majPositions(elements: ElementProgramme[]): Promise<void> {
    for (const e of elements) {
      const existant = this.#elements.get(e.id);
      if (existant) existant.position = e.position;
    }
  }
}
