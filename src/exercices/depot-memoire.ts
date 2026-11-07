import type { DepotExercices } from "./depot";
import type { Exercice } from "./types";

// Depot des exercices en memoire, pour les tests. Il clone a l'ecriture et a la
// lecture, pour les memes semantiques de valeur qu'une vraie base.
export class DepotExercicesMemoire implements DepotExercices {
  readonly #parIdentifiant = new Map<string, Exercice>();

  async creer(exercice: Exercice): Promise<void> {
    this.#parIdentifiant.set(exercice.identifiant, structuredClone(exercice));
  }
  async remplacer(exercice: Exercice): Promise<void> {
    this.#parIdentifiant.set(exercice.identifiant, structuredClone(exercice));
  }
  async parIdentifiant(identifiant: string): Promise<Exercice | null> {
    const e = this.#parIdentifiant.get(identifiant);
    return e ? structuredClone(e) : null;
  }
  async existeIdentifiant(identifiant: string): Promise<boolean> {
    return this.#parIdentifiant.has(identifiant);
  }
  async parNotion(notionId: string): Promise<Exercice[]> {
    return [...this.#parIdentifiant.values()]
      .filter((e) => e.notionId === notionId)
      .map((e) => structuredClone(e));
  }
  async nombreParNotion(notionId: string): Promise<number> {
    return [...this.#parIdentifiant.values()].filter((e) => e.notionId === notionId).length;
  }
  async nombreParFilRouge(filRougeId: string): Promise<number> {
    return [...this.#parIdentifiant.values()].filter((e) => e.filRougeId === filRougeId).length;
  }
}
