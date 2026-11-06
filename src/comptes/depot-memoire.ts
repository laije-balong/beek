import type { DepotComptes } from "./depot";
import { type Compte, ErreurCompte } from "./types";

// Depot en memoire, pour les tests. Il clone a l'ecriture et a la lecture, pour
// donner les memes semantiques de valeur qu'une vraie base.
export class DepotComptesMemoire implements DepotComptes {
  readonly #parId = new Map<string, Compte>();
  readonly #idParEmail = new Map<string, string>();

  async parEmail(email: string): Promise<Compte | null> {
    const id = this.#idParEmail.get(email.toLowerCase());
    if (!id) return null;
    const c = this.#parId.get(id);
    return c ? structuredClone(c) : null;
  }

  async parId(id: string): Promise<Compte | null> {
    const c = this.#parId.get(id);
    return c ? structuredClone(c) : null;
  }

  async creer(compte: Compte): Promise<void> {
    if (this.#idParEmail.has(compte.email.toLowerCase())) {
      throw new ErreurCompte("adresse deja utilisee");
    }
    this.#parId.set(compte.id, structuredClone(compte));
    this.#idParEmail.set(compte.email.toLowerCase(), compte.id);
  }

  async mettreAJour(compte: Compte): Promise<void> {
    if (!this.#parId.has(compte.id)) {
      throw new ErreurCompte("compte introuvable");
    }
    this.#parId.set(compte.id, structuredClone(compte));
  }

  async existeFormateur(): Promise<boolean> {
    for (const c of this.#parId.values()) {
      if (c.role === "formateur") return true;
    }
    return false;
  }
}
