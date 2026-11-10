import type { BaseD1 } from "../comptes/depot-d1";
import type { DepotProgrammes } from "./depot";
import type { ElementProgramme, Programme } from "./types";

interface LigneProgramme {
  id: string;
  nom: string;
  filiere_id: string;
  fil_rouge_id: string | null;
}
interface LigneElement {
  id: string;
  programme_id: string;
  position: number;
  exercice_identifiant: string;
}

function versProgramme(l: LigneProgramme): Programme {
  return { id: l.id, nom: l.nom, filiereId: l.filiere_id, filRougeId: l.fil_rouge_id };
}
function versElement(l: LigneElement): ElementProgramme {
  return {
    id: l.id,
    programmeId: l.programme_id,
    position: l.position,
    exerciceIdentifiant: l.exercice_identifiant,
  };
}

export class DepotProgrammesD1 implements DepotProgrammes {
  readonly #db: BaseD1;

  constructor(db: BaseD1) {
    this.#db = db;
  }

  async creerProgramme(programme: Programme): Promise<void> {
    await this.#db
      .prepare("INSERT INTO programme (id, nom, filiere_id, fil_rouge_id) VALUES (?, ?, ?, ?)")
      .bind(programme.id, programme.nom, programme.filiereId, programme.filRougeId)
      .run();
  }
  async programmeParId(id: string): Promise<Programme | null> {
    const l = await this.#db
      .prepare("SELECT * FROM programme WHERE id = ?")
      .bind(id)
      .first<LigneProgramme>();
    return l ? versProgramme(l) : null;
  }
  async programmes(): Promise<Programme[]> {
    const { results } = await this.#db
      .prepare("SELECT * FROM programme ORDER BY nom")
      .all<LigneProgramme>();
    return results.map(versProgramme);
  }

  async ajouterElement(element: ElementProgramme): Promise<void> {
    await this.#db
      .prepare(
        "INSERT INTO element_programme (id, programme_id, position, exercice_identifiant) VALUES (?, ?, ?, ?)"
      )
      .bind(element.id, element.programmeId, element.position, element.exerciceIdentifiant)
      .run();
  }
  async elementParId(id: string): Promise<ElementProgramme | null> {
    const l = await this.#db
      .prepare("SELECT * FROM element_programme WHERE id = ?")
      .bind(id)
      .first<LigneElement>();
    return l ? versElement(l) : null;
  }
  async elementsDuProgramme(programmeId: string): Promise<ElementProgramme[]> {
    const { results } = await this.#db
      .prepare("SELECT * FROM element_programme WHERE programme_id = ? ORDER BY position")
      .bind(programmeId)
      .all<LigneElement>();
    return results.map(versElement);
  }
  async retirerElement(id: string): Promise<void> {
    await this.#db.prepare("DELETE FROM element_programme WHERE id = ?").bind(id).run();
  }
  async majPositions(elements: ElementProgramme[]): Promise<void> {
    for (const e of elements) {
      await this.#db
        .prepare("UPDATE element_programme SET position = ? WHERE id = ?")
        .bind(e.position, e.id)
        .run();
    }
  }
}
