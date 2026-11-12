import type { BaseD1 } from "../comptes/depot-d1";
import type { DepotCommentaires } from "./depot";
import type { AuteurCommentaire, Commentaire } from "./types";

interface LigneCommentaire {
  id: string;
  exercice_identifiant: string;
  apprenant_id: string;
  auteur: string;
  texte: string;
  date: number;
  masque: number;
}

function versCommentaire(l: LigneCommentaire): Commentaire {
  return {
    id: l.id,
    exerciceIdentifiant: l.exercice_identifiant,
    apprenantId: l.apprenant_id,
    auteur: l.auteur as AuteurCommentaire,
    texte: l.texte,
    date: l.date,
    masque: l.masque === 1,
  };
}

export class DepotCommentairesD1 implements DepotCommentaires {
  readonly #db: BaseD1;

  constructor(db: BaseD1) {
    this.#db = db;
  }

  async creer(c: Commentaire): Promise<void> {
    await this.#db
      .prepare(
        `INSERT INTO commentaire (id, exercice_identifiant, apprenant_id, auteur, texte, date, masque)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(c.id, c.exerciceIdentifiant, c.apprenantId, c.auteur, c.texte, c.date, c.masque ? 1 : 0)
      .run();
  }
  async fil(apprenantId: string, exerciceIdentifiant: string): Promise<Commentaire[]> {
    const { results } = await this.#db
      .prepare(
        "SELECT * FROM commentaire WHERE apprenant_id = ? AND exercice_identifiant = ? ORDER BY date"
      )
      .bind(apprenantId, exerciceIdentifiant)
      .all<LigneCommentaire>();
    return results.map(versCommentaire);
  }
  async nombreDeLApprenantDepuis(apprenantId: string, borneMs: number): Promise<number> {
    const l = await this.#db
      .prepare(
        "SELECT COUNT(*) AS n FROM commentaire WHERE apprenant_id = ? AND auteur = 'apprenant' AND date >= ?"
      )
      .bind(apprenantId, borneMs)
      .first<{ n: number }>();
    return l?.n ?? 0;
  }
  async fils(): Promise<{ apprenantId: string; exerciceIdentifiant: string }[]> {
    const { results } = await this.#db
      .prepare(
        "SELECT DISTINCT apprenant_id, exercice_identifiant FROM commentaire ORDER BY apprenant_id"
      )
      .all<{ apprenant_id: string; exercice_identifiant: string }>();
    return results.map((r) => ({
      apprenantId: r.apprenant_id,
      exerciceIdentifiant: r.exercice_identifiant,
    }));
  }
}
