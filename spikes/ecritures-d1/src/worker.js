// Spike B : comptabilite des ecritures D1.
//
// Pour chaque type d'action d'un apprenant, on mesure les lignes ecrites,
// index compris, et les octets stockes. On mesure aussi une journee type.
// D1 renvoie meta.rows_written et meta.size_after par requete.

function filler(n) {
  return "x".repeat(n);
}

// Schema des tables centrales et de leurs index, d'apres l'annexe D.
const SCHEMA = [
  "DROP TABLE IF EXISTS tentative",
  "DROP TABLE IF EXISTS trace",
  "DROP TABLE IF EXISTS commentaire",
  "DROP TABLE IF EXISTS progression_element",
  "DROP TABLE IF EXISTS synthese_apprenant",
  "DROP TABLE IF EXISTS utilisateur",
  "DROP TABLE IF EXISTS exercice",
  "CREATE TABLE utilisateur (id INTEGER PRIMARY KEY, nom TEXT, email TEXT UNIQUE, role TEXT, statut TEXT)",
  "CREATE TABLE exercice (id TEXT PRIMARY KEY, type TEXT, notion_id INTEGER)",
  "CREATE TABLE tentative (id INTEGER PRIMARY KEY, apprenant_id INTEGER, exercice_id TEXT, date_heure TEXT, reponse TEXT, resultat TEXT, indice TEXT, reponse_collee INTEGER, nb_executions INTEGER)",
  "CREATE INDEX idx_tentative_app_ex ON tentative(apprenant_id, exercice_id)",
  "CREATE INDEX idx_tentative_date ON tentative(date_heure)",
  "CREATE TABLE trace (id INTEGER PRIMARY KEY, apprenant_id INTEGER, exercice_id TEXT, type_evt TEXT, date_heure TEXT, detail TEXT, longueur INTEGER)",
  "CREATE INDEX idx_trace_app ON trace(apprenant_id)",
  "CREATE INDEX idx_trace_app_ex ON trace(apprenant_id, exercice_id)",
  "CREATE INDEX idx_trace_type ON trace(type_evt)",
  "CREATE TABLE progression_element (attribution_id INTEGER, element_id TEXT, statut TEXT, nb_fausses INTEGER, xp_gagnes INTEGER, PRIMARY KEY (attribution_id, element_id))",
  "CREATE TABLE commentaire (id INTEGER PRIMARY KEY, apprenant_id INTEGER, exercice_id TEXT, auteur TEXT, texte TEXT, date_heure TEXT, statut TEXT)",
  "CREATE INDEX idx_comment_ex_app ON commentaire(exercice_id, apprenant_id)",
  "CREATE TABLE synthese_apprenant (apprenant_id INTEGER PRIMARY KEY, elements_termines INTEGER, xp INTEGER, palier INTEGER, dernier_acces TEXT, nb_commentaires_jour INTEGER)",
  "INSERT INTO utilisateur(id,nom,email,role,statut) VALUES (1,'Test','a@b.co','apprenant','actif')",
  "INSERT INTO exercice(id,type,notion_id) VALUES ('PY-FON-012','T02',1)",
  "INSERT INTO progression_element(attribution_id,element_id,statut,nb_fausses,xp_gagnes) VALUES (1,'PY-FON-012','en_cours',0,0)",
  "INSERT INTO synthese_apprenant(apprenant_id,elements_termines,xp,palier,dernier_acces,nb_commentaires_jour) VALUES (1,0,0,1,'',0)",
];

// Une action rend la liste des requetes qu'elle declenche cote serveur.
function actionSubmit(db) {
  const dt = new Date().toISOString();
  return [
    db.prepare("INSERT INTO tentative(apprenant_id, exercice_id, date_heure, reponse, resultat, indice, reponse_collee, nb_executions) VALUES (1,'PY-FON-012',?,?, 'faux', ?, 0, 0)").bind(dt, filler(50), filler(40)),
    db.prepare("UPDATE progression_element SET nb_fausses = nb_fausses + 1 WHERE attribution_id = 1 AND element_id = 'PY-FON-012'"),
    db.prepare("UPDATE synthese_apprenant SET dernier_acces = ? WHERE apprenant_id = 1").bind(dt),
  ];
}
function actionCopy(db) {
  const dt = new Date().toISOString();
  return [db.prepare("INSERT INTO trace(apprenant_id, exercice_id, type_evt, date_heure, detail, longueur) VALUES (1,'PY-FON-012','copie',?,?,500)").bind(dt, filler(500))];
}
function actionPaste(db) {
  const dt = new Date().toISOString();
  return [db.prepare("INSERT INTO trace(apprenant_id, exercice_id, type_evt, date_heure, detail, longueur) VALUES (1,'PY-FON-012','collage',?,?,5000)").bind(dt, filler(5000))];
}
function actionExit(db) {
  const dt = new Date().toISOString();
  return [db.prepare("INSERT INTO trace(apprenant_id, exercice_id, type_evt, date_heure, detail, longueur) VALUES (1,'PY-FON-012','sortie',?, '42', 0)").bind(dt)];
}
function actionComment(db) {
  const dt = new Date().toISOString();
  return [
    db.prepare("INSERT INTO commentaire(apprenant_id, exercice_id, auteur, texte, date_heure, statut) VALUES (1,'PY-FON-012','apprenant',?,?,'visible')").bind(filler(200), dt),
    db.prepare("UPDATE synthese_apprenant SET nb_commentaires_jour = nb_commentaires_jour + 1 WHERE apprenant_id = 1"),
  ];
}

async function dbSize(db) {
  const r = await db.prepare("SELECT 1 AS x").all();
  return r.meta && typeof r.meta.size_after === "number" ? r.meta.size_after : null;
}

// Execute une liste de requetes par lots, pour rester sous la limite de
// sous-requetes. Additionne les lignes ecrites et garde la taille finale.
async function runStatements(db, stmts) {
  let lignes = 0;
  let taille = null;
  for (let i = 0; i < stmts.length; i += 50) {
    const lot = stmts.slice(i, i + 50);
    const resultats = await db.batch(lot);
    for (const res of resultats) {
      lignes += (res.meta && res.meta.rows_written) || 0;
      if (res.meta && typeof res.meta.size_after === "number") taille = res.meta.size_after;
    }
  }
  return { lignes, taille };
}

async function mesurer(db, action, n) {
  const avant = await dbSize(db);
  const stmts = [];
  for (let i = 0; i < n; i++) stmts.push(...action(db));
  const { lignes, taille } = await runStatements(db, stmts);
  const apres = taille !== null ? taille : await dbSize(db);
  const octets = avant !== null && apres !== null ? apres - avant : null;
  return {
    n,
    lignes_ecrites_total: lignes,
    lignes_ecrites_par_action: Math.round((lignes / n) * 100) / 100,
    octets_total: octets,
    octets_par_action: octets !== null ? Math.round((octets / n) * 10) / 10 : null,
  };
}

const ACTIONS = {
  submit: actionSubmit,
  copy: actionCopy,
  paste: actionPaste,
  exit: actionExit,
  comment: actionComment,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const db = env.DB;

    if (url.pathname === "/reset") {
      await db.batch(SCHEMA.map((s) => db.prepare(s)));
      return Response.json({ ok: true, message: "Schema et donnees de depart crees." });
    }

    if (ACTIONS[url.pathname.slice(1)]) {
      const n = parseInt(url.searchParams.get("n") || "100", 10);
      return Response.json(await mesurer(db, ACTIONS[url.pathname.slice(1)], n));
    }

    if (url.pathname === "/day") {
      // Journee type chargee : 100 reponses, 150 traces, 5 commentaires.
      const composition = { submit: 100, copie: 50, collage: 20, sortie: 80, comment: 5 };
      const avant = await dbSize(db);
      const stmts = [];
      for (let i = 0; i < composition.submit; i++) stmts.push(...actionSubmit(db));
      for (let i = 0; i < composition.copie; i++) stmts.push(...actionCopy(db));
      for (let i = 0; i < composition.collage; i++) stmts.push(...actionPaste(db));
      for (let i = 0; i < composition.sortie; i++) stmts.push(...actionExit(db));
      for (let i = 0; i < composition.comment; i++) stmts.push(...actionComment(db));
      const { lignes, taille } = await runStatements(db, stmts);
      const apres = taille !== null ? taille : await dbSize(db);
      const octets = avant !== null && apres !== null ? apres - avant : null;
      const mo = (v) => Math.round((v / (1024 * 1024)) * 10) / 10;
      return Response.json({
        composition,
        collages_au_maximum: "oui, 5000 caracteres chacun, borne haute",
        lignes_ecrites_jour: lignes,
        octets_jour: octets,
        lignes_ecrites_classe_jour: lignes * 30,
        quota_ecritures_jour: 100000,
        octets_mois_classe: octets !== null ? octets * 20 * 30 : null,
        mo_mois_classe: octets !== null ? mo(octets * 20 * 30) : null,
        estimation_note_cadrage_mo_mois: 45,
      });
    }

    return new Response(
      "Beek spike ecritures D1. Routes : /reset , /submit , /copy , /paste , /exit , /comment , /day . Parametre ?n= pour le nombre d'actions.",
      { headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  },
};
