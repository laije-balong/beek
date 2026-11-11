import type { BaseD1 } from "../comptes/depot-d1";
import type { DepotAttributions } from "./depot-attribution";
import type { Attribution, ProgressionElement, StatutElement } from "./types";

interface LigneAttribution {
  id: string;
  apprenant_id: string;
  programme_id: string;
  date: number;
}
interface LigneProgression {
  id: string;
  attribution_id: string;
  element_id: string;
  statut: string;
  reponses_fausses: number;
  date_explication: number | null;
  xp_gagnes: number;
  date_ouverture: number | null;
  date_fin: number | null;
  temps_passe_ms: number;
}

function versAttribution(l: LigneAttribution): Attribution {
  return { id: l.id, apprenantId: l.apprenant_id, programmeId: l.programme_id, date: l.date };
}
function versProgression(l: LigneProgression): ProgressionElement {
  return {
    id: l.id,
    attributionId: l.attribution_id,
    elementId: l.element_id,
    statut: l.statut as StatutElement,
    reponsesFausses: l.reponses_fausses,
    dateExplication: l.date_explication,
    xpGagnes: l.xp_gagnes === 1,
    dateOuverture: l.date_ouverture,
    dateFin: l.date_fin,
    tempsPasseMs: l.temps_passe_ms,
  };
}

export class DepotAttributionsD1 implements DepotAttributions {
  readonly #db: BaseD1;

  constructor(db: BaseD1) {
    this.#db = db;
  }

  async creerAttribution(a: Attribution): Promise<void> {
    await this.#db
      .prepare("INSERT INTO attribution (id, apprenant_id, programme_id, date) VALUES (?, ?, ?, ?)")
      .bind(a.id, a.apprenantId, a.programmeId, a.date)
      .run();
  }
  async attributionParApprenantEtProgramme(
    apprenantId: string,
    programmeId: string
  ): Promise<Attribution | null> {
    const l = await this.#db
      .prepare("SELECT * FROM attribution WHERE apprenant_id = ? AND programme_id = ?")
      .bind(apprenantId, programmeId)
      .first<LigneAttribution>();
    return l ? versAttribution(l) : null;
  }
  async attributionsDeLApprenant(apprenantId: string): Promise<Attribution[]> {
    const { results } = await this.#db
      .prepare("SELECT * FROM attribution WHERE apprenant_id = ? ORDER BY date")
      .bind(apprenantId)
      .all<LigneAttribution>();
    return results.map(versAttribution);
  }

  async creerProgression(p: ProgressionElement): Promise<void> {
    await this.#db
      .prepare(
        `INSERT INTO progression_element (
          id, attribution_id, element_id, statut, reponses_fausses, date_explication,
          xp_gagnes, date_ouverture, date_fin, temps_passe_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        p.id,
        p.attributionId,
        p.elementId,
        p.statut,
        p.reponsesFausses,
        p.dateExplication,
        p.xpGagnes ? 1 : 0,
        p.dateOuverture,
        p.dateFin,
        p.tempsPasseMs
      )
      .run();
  }
  async progressionsDeLAttribution(attributionId: string): Promise<ProgressionElement[]> {
    const { results } = await this.#db
      .prepare("SELECT * FROM progression_element WHERE attribution_id = ?")
      .bind(attributionId)
      .all<LigneProgression>();
    return results.map(versProgression);
  }
  async progressionParElement(
    attributionId: string,
    elementId: string
  ): Promise<ProgressionElement | null> {
    const l = await this.#db
      .prepare("SELECT * FROM progression_element WHERE attribution_id = ? AND element_id = ?")
      .bind(attributionId, elementId)
      .first<LigneProgression>();
    return l ? versProgression(l) : null;
  }
  async nombreApprenantsAyantCommence(elementId: string): Promise<number> {
    const l = await this.#db
      .prepare(
        `SELECT COUNT(*) AS n FROM progression_element
         WHERE element_id = ? AND statut IN ('en-cours', 'reussi', 'reussi-avec-explication')`
      )
      .bind(elementId)
      .first<{ n: number }>();
    return l?.n ?? 0;
  }
  async mettreAJourProgression(p: ProgressionElement): Promise<void> {
    await this.#db
      .prepare(
        `UPDATE progression_element SET
          statut = ?, reponses_fausses = ?, date_explication = ?, xp_gagnes = ?,
          date_ouverture = ?, date_fin = ?, temps_passe_ms = ?
        WHERE id = ?`
      )
      .bind(
        p.statut,
        p.reponsesFausses,
        p.dateExplication,
        p.xpGagnes ? 1 : 0,
        p.dateOuverture,
        p.dateFin,
        p.tempsPasseMs,
        p.id
      )
      .run();
  }
}
