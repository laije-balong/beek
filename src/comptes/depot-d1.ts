import type { DepotComptes } from "./depot";
import {
  type Compte,
  type CodeDeSecours,
  type Role,
  type StatutCompte,
  ErreurCompte,
} from "./types";

// Sous-ensemble de l'API D1 que le depot utilise. Il evite une dependance de
// types. Une vraie base D1 satisfait cette interface par sa forme.
export interface BaseD1 {
  prepare(sql: string): RequeteD1;
}
export interface RequeteD1 {
  bind(...valeurs: unknown[]): RequeteD1;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

function toHex(a: Uint8Array): string {
  return Array.from(a)
    .map((o) => o.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(h: string): Uint8Array {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

// Les codes de secours sont ranges en JSON, sel et verificateur en hexadecimal,
// pour garder l'agregat compte entier sans table jointe, EM-ACC-13.
interface CodeSecoursJson {
  sel: string;
  verificateur: string;
  consomme: boolean;
}

function codesDepuisJson(json: string | null): CodeDeSecours[] {
  if (!json) return [];
  const brut = JSON.parse(json) as CodeSecoursJson[];
  return brut.map((c) => ({
    sel: fromHex(c.sel),
    verificateur: fromHex(c.verificateur),
    consomme: c.consomme,
  }));
}

function codesVersJson(codes: CodeDeSecours[]): string {
  return JSON.stringify(
    codes.map((c) => ({
      sel: toHex(c.sel),
      verificateur: toHex(c.verificateur),
      consomme: c.consomme,
    }))
  );
}

interface LigneCompte {
  id: string;
  nom: string;
  email: string;
  role: string;
  statut: string;
  sel: string;
  verificateur: string;
  expiration_mot_de_passe_temporaire: number | null;
  date_creation: number;
  date_activation: number | null;
  date_consentement: number | null;
  echecs_connexion: number;
  fin_blocage: number | null;
  statut_avant_blocage: string | null;
  mots_de_passe_temporaires_du_jour: number;
  jour_des_mots_de_passe_temporaires: string | null;
  codes_secours: string | null;
}

function versCompte(l: LigneCompte): Compte {
  return {
    id: l.id,
    nom: l.nom,
    email: l.email,
    role: l.role as Role,
    statut: l.statut as StatutCompte,
    sel: fromHex(l.sel),
    verificateur: fromHex(l.verificateur),
    expirationMotDePasseTemporaire: l.expiration_mot_de_passe_temporaire,
    dateCreation: l.date_creation,
    dateActivation: l.date_activation,
    dateConsentement: l.date_consentement,
    echecsConnexion: l.echecs_connexion,
    finBlocage: l.fin_blocage,
    statutAvantBlocage: l.statut_avant_blocage as StatutCompte | null,
    motsDePasseTemporairesDuJour: l.mots_de_passe_temporaires_du_jour,
    jourDesMotsDePasseTemporaires: l.jour_des_mots_de_passe_temporaires,
    codesDeSecours: codesDepuisJson(l.codes_secours),
  };
}

// Depot des comptes sur D1. Meme interface que le depot en memoire.
export class DepotComptesD1 implements DepotComptes {
  readonly #db: BaseD1;

  constructor(db: BaseD1) {
    this.#db = db;
  }

  async parEmail(email: string): Promise<Compte | null> {
    const l = await this.#db
      .prepare("SELECT * FROM compte WHERE email = ?")
      .bind(email.toLowerCase())
      .first<LigneCompte>();
    return l ? versCompte(l) : null;
  }

  async parId(id: string): Promise<Compte | null> {
    const l = await this.#db
      .prepare("SELECT * FROM compte WHERE id = ?")
      .bind(id)
      .first<LigneCompte>();
    return l ? versCompte(l) : null;
  }

  async existeFormateur(): Promise<boolean> {
    const l = await this.#db
      .prepare("SELECT 1 AS u FROM compte WHERE role = 'formateur' LIMIT 1")
      .first<{ u: number }>();
    return l !== null;
  }

  async creer(compte: Compte): Promise<void> {
    try {
      await this.#db
        .prepare(
          `INSERT INTO compte (
            id, nom, email, role, statut, sel, verificateur,
            expiration_mot_de_passe_temporaire, date_creation, date_activation,
            date_consentement, echecs_connexion, fin_blocage, statut_avant_blocage,
            mots_de_passe_temporaires_du_jour, jour_des_mots_de_passe_temporaires,
            codes_secours
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          compte.id,
          compte.nom,
          compte.email,
          compte.role,
          compte.statut,
          toHex(compte.sel),
          toHex(compte.verificateur),
          compte.expirationMotDePasseTemporaire,
          compte.dateCreation,
          compte.dateActivation,
          compte.dateConsentement,
          compte.echecsConnexion,
          compte.finBlocage,
          compte.statutAvantBlocage,
          compte.motsDePasseTemporairesDuJour,
          compte.jourDesMotsDePasseTemporaires,
          codesVersJson(compte.codesDeSecours)
        )
        .run();
    } catch (e) {
      if (String(e).includes("UNIQUE")) {
        throw new ErreurCompte("adresse deja utilisee");
      }
      throw e;
    }
  }

  async mettreAJour(compte: Compte): Promise<void> {
    await this.#db
      .prepare(
        `UPDATE compte SET
          nom = ?, email = ?, role = ?, statut = ?, sel = ?, verificateur = ?,
          expiration_mot_de_passe_temporaire = ?, date_activation = ?, date_consentement = ?,
          echecs_connexion = ?, fin_blocage = ?, statut_avant_blocage = ?,
          mots_de_passe_temporaires_du_jour = ?, jour_des_mots_de_passe_temporaires = ?,
          codes_secours = ?
        WHERE id = ?`
      )
      .bind(
        compte.nom,
        compte.email,
        compte.role,
        compte.statut,
        toHex(compte.sel),
        toHex(compte.verificateur),
        compte.expirationMotDePasseTemporaire,
        compte.dateActivation,
        compte.dateConsentement,
        compte.echecsConnexion,
        compte.finBlocage,
        compte.statutAvantBlocage,
        compte.motsDePasseTemporairesDuJour,
        compte.jourDesMotsDePasseTemporaires,
        codesVersJson(compte.codesDeSecours),
        compte.id
      )
      .run();
  }
}
