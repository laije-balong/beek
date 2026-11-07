import type { BaseD1 } from "../comptes/depot-d1";
import type { DepotExercices } from "./depot";
import type { ContenuExercice, Exercice, ImageExercice, NatureExercice } from "./types";

// Le contenu propre au type et les images sont ranges en JSON. Les champs
// communs de la section 3 sont des colonnes. La reponse attendue, les indices et
// l'explication restent dans ces donnees, cote serveur (EM-EXE-03).
interface LigneExercice {
  identifiant: string;
  nature: string;
  titre: string;
  notion_id: string;
  fil_rouge_id: string | null;
  duree_minutes: number;
  enonce: string;
  images: string;
  collage_autorise: number;
  indice_generique: string;
  explication_detaillee: string;
  contenu: string;
}

function versExercice(l: LigneExercice): Exercice {
  return {
    identifiant: l.identifiant,
    nature: l.nature as NatureExercice,
    titre: l.titre,
    notionId: l.notion_id,
    filRougeId: l.fil_rouge_id,
    dureeMinutes: l.duree_minutes,
    enonce: l.enonce,
    images: JSON.parse(l.images) as ImageExercice[],
    collageAutorise: l.collage_autorise === 1,
    indiceGenerique: l.indice_generique,
    explicationDetaillee: l.explication_detaillee,
    contenu: JSON.parse(l.contenu) as ContenuExercice,
  };
}

export class DepotExercicesD1 implements DepotExercices {
  readonly #db: BaseD1;

  constructor(db: BaseD1) {
    this.#db = db;
  }

  #lignes(exercice: Exercice): unknown[] {
    return [
      exercice.identifiant,
      exercice.nature,
      exercice.titre,
      exercice.notionId,
      exercice.filRougeId,
      exercice.dureeMinutes,
      exercice.enonce,
      JSON.stringify(exercice.images),
      exercice.collageAutorise ? 1 : 0,
      exercice.indiceGenerique,
      exercice.explicationDetaillee,
      exercice.contenu.type,
      JSON.stringify(exercice.contenu),
    ];
  }

  async creer(exercice: Exercice): Promise<void> {
    await this.#inserer("INSERT", exercice);
  }
  async remplacer(exercice: Exercice): Promise<void> {
    await this.#inserer("INSERT OR REPLACE", exercice);
  }
  async #inserer(verbe: string, exercice: Exercice): Promise<void> {
    await this.#db
      .prepare(
        `${verbe} INTO exercice (
          identifiant, nature, titre, notion_id, fil_rouge_id, duree_minutes,
          enonce, images, collage_autorise, indice_generique, explication_detaillee,
          type, contenu
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(...this.#lignes(exercice))
      .run();
  }

  async parIdentifiant(identifiant: string): Promise<Exercice | null> {
    const l = await this.#db
      .prepare("SELECT * FROM exercice WHERE identifiant = ?")
      .bind(identifiant)
      .first<LigneExercice>();
    return l ? versExercice(l) : null;
  }
  async tous(): Promise<Exercice[]> {
    const { results } = await this.#db
      .prepare("SELECT * FROM exercice ORDER BY identifiant")
      .all<LigneExercice>();
    return results.map(versExercice);
  }
  async existeIdentifiant(identifiant: string): Promise<boolean> {
    const l = await this.#db
      .prepare("SELECT 1 AS u FROM exercice WHERE identifiant = ? LIMIT 1")
      .bind(identifiant)
      .first<{ u: number }>();
    return l !== null;
  }
  async parNotion(notionId: string): Promise<Exercice[]> {
    const { results } = await this.#db
      .prepare("SELECT * FROM exercice WHERE notion_id = ? ORDER BY identifiant")
      .bind(notionId)
      .all<LigneExercice>();
    return results.map(versExercice);
  }
  async nombreParNotion(notionId: string): Promise<number> {
    const l = await this.#db
      .prepare("SELECT COUNT(*) AS n FROM exercice WHERE notion_id = ?")
      .bind(notionId)
      .first<{ n: number }>();
    return l?.n ?? 0;
  }
  async nombreParFilRouge(filRougeId: string): Promise<number> {
    const l = await this.#db
      .prepare("SELECT COUNT(*) AS n FROM exercice WHERE fil_rouge_id = ?")
      .bind(filRougeId)
      .first<{ n: number }>();
    return l?.n ?? 0;
  }
}
