import type { BaseD1 } from "../comptes/depot-d1";
import type { DepotContenu } from "./depot";
import type { Domaine, Filiere, Niveau, NomNiveau, Notion } from "./types";

// Depot de la taxonomie sur D1. Meme interface que le depot en memoire. La
// reutilisation de BaseD1 evite une seconde definition de l'API D1.
export class DepotContenuD1 implements DepotContenu {
  readonly #db: BaseD1;

  constructor(db: BaseD1) {
    this.#db = db;
  }

  async creerDomaine(domaine: Domaine): Promise<void> {
    await this.#db
      .prepare("INSERT INTO domaine (id, nom, ordre) VALUES (?, ?, ?)")
      .bind(domaine.id, domaine.nom, domaine.ordre)
      .run();
  }
  async domaineParId(id: string): Promise<Domaine | null> {
    return this.#db.prepare("SELECT * FROM domaine WHERE id = ?").bind(id).first<Domaine>();
  }
  async domaineParNom(nom: string): Promise<Domaine | null> {
    return this.#db.prepare("SELECT * FROM domaine WHERE nom = ?").bind(nom).first<Domaine>();
  }
  async domaines(): Promise<Domaine[]> {
    const { results } = await this.#db
      .prepare("SELECT * FROM domaine ORDER BY ordre")
      .all<Domaine>();
    return results;
  }

  async creerFiliereAvecNiveaux(filiere: Filiere, niveaux: Niveau[]): Promise<void> {
    await this.#db
      .prepare("INSERT INTO filiere (id, nom, ordre, domaine_id) VALUES (?, ?, ?, ?)")
      .bind(filiere.id, filiere.nom, filiere.ordre, filiere.domaineId)
      .run();
    for (const n of niveaux) {
      await this.#db
        .prepare("INSERT INTO niveau (id, nom, ordre, filiere_id) VALUES (?, ?, ?, ?)")
        .bind(n.id, n.nom, n.ordre, n.filiereId)
        .run();
    }
  }
  async filiereParId(id: string): Promise<Filiere | null> {
    const l = await this.#db
      .prepare("SELECT id, nom, ordre, domaine_id FROM filiere WHERE id = ?")
      .bind(id)
      .first<{ id: string; nom: string; ordre: number; domaine_id: string }>();
    return l ? { id: l.id, nom: l.nom, ordre: l.ordre, domaineId: l.domaine_id } : null;
  }
  async filiereParNomDansDomaine(domaineId: string, nom: string): Promise<Filiere | null> {
    const l = await this.#db
      .prepare("SELECT id, nom, ordre, domaine_id FROM filiere WHERE domaine_id = ? AND nom = ?")
      .bind(domaineId, nom)
      .first<{ id: string; nom: string; ordre: number; domaine_id: string }>();
    return l ? { id: l.id, nom: l.nom, ordre: l.ordre, domaineId: l.domaine_id } : null;
  }
  async filieresDuDomaine(domaineId: string): Promise<Filiere[]> {
    const { results } = await this.#db
      .prepare(
        "SELECT id, nom, ordre, domaine_id FROM filiere WHERE domaine_id = ? ORDER BY ordre"
      )
      .bind(domaineId)
      .all<{ id: string; nom: string; ordre: number; domaine_id: string }>();
    return results.map((l) => ({ id: l.id, nom: l.nom, ordre: l.ordre, domaineId: l.domaine_id }));
  }
  async niveauParId(id: string): Promise<Niveau | null> {
    const l = await this.#db
      .prepare("SELECT id, nom, ordre, filiere_id FROM niveau WHERE id = ?")
      .bind(id)
      .first<{ id: string; nom: string; ordre: number; filiere_id: string }>();
    return l
      ? { id: l.id, nom: l.nom as NomNiveau, ordre: l.ordre, filiereId: l.filiere_id }
      : null;
  }
  async niveauxDeFiliere(filiereId: string): Promise<Niveau[]> {
    const { results } = await this.#db
      .prepare("SELECT id, nom, ordre, filiere_id FROM niveau WHERE filiere_id = ? ORDER BY ordre")
      .bind(filiereId)
      .all<{ id: string; nom: string; ordre: number; filiere_id: string }>();
    return results.map((l) => ({
      id: l.id,
      nom: l.nom as NomNiveau,
      ordre: l.ordre,
      filiereId: l.filiere_id,
    }));
  }

  async creerNotion(notion: Notion): Promise<void> {
    await this.#db
      .prepare("INSERT INTO notion (id, nom, ordre, niveau_id) VALUES (?, ?, ?, ?)")
      .bind(notion.id, notion.nom, notion.ordre, notion.niveauId)
      .run();
  }
  async notionParId(id: string): Promise<Notion | null> {
    const l = await this.#db
      .prepare("SELECT id, nom, ordre, niveau_id FROM notion WHERE id = ?")
      .bind(id)
      .first<{ id: string; nom: string; ordre: number; niveau_id: string }>();
    return l ? { id: l.id, nom: l.nom, ordre: l.ordre, niveauId: l.niveau_id } : null;
  }
  async notionParNomDansNiveau(niveauId: string, nom: string): Promise<Notion | null> {
    const l = await this.#db
      .prepare("SELECT id, nom, ordre, niveau_id FROM notion WHERE niveau_id = ? AND nom = ?")
      .bind(niveauId, nom)
      .first<{ id: string; nom: string; ordre: number; niveau_id: string }>();
    return l ? { id: l.id, nom: l.nom, ordre: l.ordre, niveauId: l.niveau_id } : null;
  }
  async notionsDuNiveau(niveauId: string): Promise<Notion[]> {
    const { results } = await this.#db
      .prepare("SELECT id, nom, ordre, niveau_id FROM notion WHERE niveau_id = ? ORDER BY ordre")
      .bind(niveauId)
      .all<{ id: string; nom: string; ordre: number; niveau_id: string }>();
    return results.map((l) => ({ id: l.id, nom: l.nom, ordre: l.ordre, niveauId: l.niveau_id }));
  }
  async supprimerNotion(id: string): Promise<void> {
    await this.#db.prepare("DELETE FROM notion WHERE id = ?").bind(id).run();
  }
  async nombreExercicesDeNotion(_notionId: string): Promise<number> {
    // La table des exercices arrive en iteration 3. Sans elle, aucune notion
    // n'est encore utilisee, donc la garde US-05 CA4 compte zero.
    return 0;
  }
}
