import type { DepotContenu } from "./depot";
import type { Domaine, Filiere, Niveau, Notion } from "./types";

function parOrdre<T extends { ordre: number }>(liste: T[]): T[] {
  return liste.slice().sort((a, b) => a.ordre - b.ordre);
}

// Depot de la taxonomie en memoire, pour les tests. Il clone a l'ecriture et a
// la lecture, pour les memes semantiques de valeur qu'une vraie base.
export class DepotContenuMemoire implements DepotContenu {
  readonly #domaines = new Map<string, Domaine>();
  readonly #filieres = new Map<string, Filiere>();
  readonly #niveaux = new Map<string, Niveau>();
  readonly #notions = new Map<string, Notion>();
  // En attendant les exercices de l'iteration 3, un compteur que les tests
  // peuvent fixer pour verifier la garde de suppression, US-05 CA4.
  readonly #exercicesParNotion = new Map<string, number>();

  async creerDomaine(domaine: Domaine): Promise<void> {
    this.#domaines.set(domaine.id, structuredClone(domaine));
  }
  async domaineParId(id: string): Promise<Domaine | null> {
    const d = this.#domaines.get(id);
    return d ? structuredClone(d) : null;
  }
  async domaineParNom(nom: string): Promise<Domaine | null> {
    for (const d of this.#domaines.values()) if (d.nom === nom) return structuredClone(d);
    return null;
  }
  async domaines(): Promise<Domaine[]> {
    return parOrdre([...this.#domaines.values()]).map((d) => structuredClone(d));
  }

  async creerFiliereAvecNiveaux(filiere: Filiere, niveaux: Niveau[]): Promise<void> {
    this.#filieres.set(filiere.id, structuredClone(filiere));
    for (const n of niveaux) this.#niveaux.set(n.id, structuredClone(n));
  }
  async filiereParId(id: string): Promise<Filiere | null> {
    const f = this.#filieres.get(id);
    return f ? structuredClone(f) : null;
  }
  async filiereParNomDansDomaine(domaineId: string, nom: string): Promise<Filiere | null> {
    for (const f of this.#filieres.values())
      if (f.domaineId === domaineId && f.nom === nom) return structuredClone(f);
    return null;
  }
  async filieresDuDomaine(domaineId: string): Promise<Filiere[]> {
    return parOrdre([...this.#filieres.values()].filter((f) => f.domaineId === domaineId)).map(
      (f) => structuredClone(f)
    );
  }
  async niveauParId(id: string): Promise<Niveau | null> {
    const n = this.#niveaux.get(id);
    return n ? structuredClone(n) : null;
  }
  async niveauxDeFiliere(filiereId: string): Promise<Niveau[]> {
    return parOrdre([...this.#niveaux.values()].filter((n) => n.filiereId === filiereId)).map((n) =>
      structuredClone(n)
    );
  }

  async creerNotion(notion: Notion): Promise<void> {
    this.#notions.set(notion.id, structuredClone(notion));
  }
  async notionParId(id: string): Promise<Notion | null> {
    const n = this.#notions.get(id);
    return n ? structuredClone(n) : null;
  }
  async notionParNomDansNiveau(niveauId: string, nom: string): Promise<Notion | null> {
    for (const n of this.#notions.values())
      if (n.niveauId === niveauId && n.nom === nom) return structuredClone(n);
    return null;
  }
  async notionsDuNiveau(niveauId: string): Promise<Notion[]> {
    return parOrdre([...this.#notions.values()].filter((n) => n.niveauId === niveauId)).map((n) =>
      structuredClone(n)
    );
  }
  async supprimerNotion(id: string): Promise<void> {
    this.#notions.delete(id);
  }
  async nombreExercicesDeNotion(notionId: string): Promise<number> {
    return this.#exercicesParNotion.get(notionId) ?? 0;
  }

  // Aide de test : simule des exercices rattaches a une notion.
  simulerExercices(notionId: string, nombre: number): void {
    this.#exercicesParNotion.set(notionId, nombre);
  }
}
