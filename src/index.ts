import { Hono, type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import {
  construireServiceComptes,
  construireServiceContenu,
  construireDepotContenu,
  construireDepotExercices,
  construireServiceImages,
  construireServiceProgrammes,
  construireSignataireSession,
  type Env,
} from "./fabrique";
import { ErreurCompte } from "./comptes/types";
import { ErreurContenu } from "./contenu/types";
import { ErreurImage, typeMime } from "./images/service";
import type { FormatImage } from "./exercices/types";
import { ErreurParcours } from "./parcours/types";
import { projeter } from "./exercices/projection";
import { corriger, type Soumission } from "./exercices/correction";
import { chargerRecette } from "./exercices/seed-recette";
import { PAGE_EXERCICE } from "./page-exercice";
import { PAGE_PROGRAMMES } from "./page-programmes";
import { DUREE_SESSION } from "./auth/session";
import { comparaisonConstante } from "./auth/hachage-partage";
import { toHex, fromHex } from "./util/hex";
import { PAGE_CONNEXION } from "./page-connexion";
import { PAGE_FORMATEUR } from "./page-formateur";

// SECRET_AMORCAGE n'existe qu'au moment d'amorcer le premier formateur. Le
// porteur le pose, amorce une fois, puis le retire.
type Bindings = Env & { SECRET_AMORCAGE?: string };

// Compare deux secrets a temps constant, sur leurs octets.
function secretEgal(a: string, b: string): boolean {
  const enc = new TextEncoder();
  return comparaisonConstante(enc.encode(a), enc.encode(b));
}

const app = new Hono<{ Bindings: Bindings }>();

// Options du cookie de session. Secure seulement en HTTPS, pour que le cookie
// fonctionne aussi en local sur http://localhost.
function optionsCookie(url: string) {
  return {
    httpOnly: true,
    sameSite: "Lax" as const,
    path: "/",
    secure: new URL(url).protocol === "https:",
    maxAge: Math.floor(DUREE_SESSION / 1000),
  };
}

// Lit la session du cookie, ou null si absente, invalide ou expiree.
async function sessionActuelle(c: Context<{ Bindings: Bindings }>) {
  const jeton = getCookie(c, "session");
  if (!jeton) return null;
  return construireSignataireSession(c.env).lire(jeton, Date.now());
}

// Exige une session de formateur. Renvoie la session, ou une reponse 403 a
// retourner telle quelle.
async function formateurOuRefus(c: Context<{ Bindings: Bindings }>) {
  const session = await sessionActuelle(c);
  if (!session || session.role !== "formateur") {
    return c.json({ erreur: "reserve au formateur" }, 403);
  }
  return session;
}

// Route de sante.
app.get("/sante", (c) => c.json({ ok: true, service: "beek" }));

// Sel a utiliser avant une connexion ou une activation.
app.get("/auth/sel", async (c) => {
  const email = c.req.query("email") ?? "";
  const service = construireServiceComptes(c.env);
  const sel = await service.selPourConnexion(email);
  return c.json({ selHex: toHex(sel) });
});

// Activation du compte.
app.post("/auth/activation", async (c) => {
  const corps = await c.req.json<{
    email: string;
    motDePasseTemporaire: string;
    resultatHex: string;
    seizeAns: boolean;
    traitementDonnees: boolean;
  }>();
  const service = construireServiceComptes(c.env);
  try {
    await service.activer(
      corps.email,
      corps.motDePasseTemporaire,
      fromHex(corps.resultatHex),
      { seizeAns: corps.seizeAns, traitementDonnees: corps.traitementDonnees }
    );
    return c.json({ ok: true });
  } catch (e) {
    if (e instanceof ErreurCompte) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

// Connexion d'un compte actif. Pose un cookie de session.
app.post("/auth/connexion", async (c) => {
  const corps = await c.req.json<{ email: string; resultatHex: string }>();
  const service = construireServiceComptes(c.env);
  try {
    const compte = await service.connexion(corps.email, fromHex(corps.resultatHex));
    const jeton = await construireSignataireSession(c.env).creer(
      compte.id,
      compte.role,
      Date.now()
    );
    setCookie(c, "session", jeton, optionsCookie(c.req.url));
    return c.json({ ok: true, nom: compte.nom, role: compte.role });
  } catch (e) {
    if (e instanceof ErreurCompte) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

// Changement de mot de passe apres une reinitialisation.
app.post("/auth/changement", async (c) => {
  const corps = await c.req.json<{
    email: string;
    motDePasseTemporaire: string;
    resultatHex: string;
  }>();
  const service = construireServiceComptes(c.env);
  try {
    await service.changerMotDePasse(
      corps.email,
      corps.motDePasseTemporaire,
      fromHex(corps.resultatHex)
    );
    return c.json({ ok: true });
  } catch (e) {
    if (e instanceof ErreurCompte) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

// Utilisateur de la session en cours. Renouvelle la session a chaque appel,
// ce qui donne l'expiration apres 2 heures d'inactivite.
app.get("/moi", async (c) => {
  const jeton = getCookie(c, "session");
  if (!jeton) return c.json({ erreur: "non connecte" }, 401);
  const signataire = construireSignataireSession(c.env);
  const maintenant = Date.now();
  const session = await signataire.lire(jeton, maintenant);
  if (!session) return c.json({ erreur: "non connecte" }, 401);
  const compte = await construireServiceComptes(c.env).compte(session.id);
  if (!compte) return c.json({ erreur: "non connecte" }, 401);
  setCookie(
    c,
    "session",
    await signataire.creer(session.id, session.role, maintenant),
    optionsCookie(c.req.url)
  );
  // Un formateur voit le nombre de codes de secours qui lui restent, EM-ACC-13.
  const codesSecoursRestants =
    compte.role === "formateur"
      ? compte.codesDeSecours.filter((cs) => !cs.consomme).length
      : undefined;
  return c.json({ nom: compte.nom, role: compte.role, codesSecoursRestants });
});

// Deconnexion.
app.post("/auth/deconnexion", (c) => {
  deleteCookie(c, "session", { path: "/" });
  return c.json({ ok: true });
});

// Recuperation du compte formateur par un code de secours, EM-ACC-13. Un code
// valide ouvre le choix d'un nouveau mot de passe et pose une session.
app.post("/auth/recuperation", async (c) => {
  const corps = await c.req.json<{
    email: string;
    code: string;
    resultatHex: string;
  }>();
  const service = construireServiceComptes(c.env);
  try {
    const compte = await service.utiliserCodeDeSecours(
      corps.email,
      corps.code,
      fromHex(corps.resultatHex)
    );
    const jeton = await construireSignataireSession(c.env).creer(
      compte.id,
      compte.role,
      Date.now()
    );
    setCookie(c, "session", jeton, optionsCookie(c.req.url));
    return c.json({ ok: true, nom: compte.nom, role: compte.role });
  } catch (e) {
    if (e instanceof ErreurCompte) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

// Amorcage du premier formateur, a la mise en service. Garde par le secret
// d'amorcage : la route n'existe que si SECRET_AMORCAGE est pose, et le secret
// fourni doit correspondre. Refuse si un formateur existe deja. Renvoie le
// coupon et les codes de secours, affiches une seule fois.
app.post("/amorcage", async (c) => {
  const attendu = c.env.SECRET_AMORCAGE;
  if (!attendu) return c.json({ erreur: "indisponible" }, 404);
  const corps = await c.req.json<{ secret: string; email: string; nom: string }>();
  if (!secretEgal(corps.secret ?? "", attendu)) {
    return c.json({ erreur: "secret refuse" }, 403);
  }
  const service = construireServiceComptes(c.env);
  try {
    const { motDePasseTemporaire, codesDeSecours } = await service.amorcerFormateur(
      corps.nom,
      corps.email
    );
    return c.json({ email: corps.email, motDePasseTemporaire, codesDeSecours });
  } catch (e) {
    if (e instanceof ErreurCompte) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

// Creation d'un apprenant par le formateur. Reservee au role formateur.
// Renvoie les donnees du coupon E-20, affiche une seule fois.
app.post("/formateur/apprenants", async (c) => {
  const session = await sessionActuelle(c);
  if (!session || session.role !== "formateur") {
    return c.json({ erreur: "reserve au formateur" }, 403);
  }
  const corps = await c.req.json<{ email: string; nom: string }>();
  const service = construireServiceComptes(c.env);
  try {
    const { compte, motDePasseTemporaire } = await service.creerCompte(
      corps.nom,
      corps.email,
      "apprenant"
    );
    return c.json({
      nom: compte.nom,
      email: compte.email,
      motDePasseTemporaire,
      expirationMs: compte.expirationMotDePasseTemporaire,
      site: new URL(c.req.url).origin,
    });
  } catch (e) {
    if (e instanceof ErreurCompte) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

// Regeneration des codes de secours par le formateur connecte, EM-ACC-13. Les
// anciens deviennent caducs. Renvoie les nouveaux codes, affiches une seule fois.
app.post("/formateur/codes-secours", async (c) => {
  const session = await sessionActuelle(c);
  if (!session || session.role !== "formateur") {
    return c.json({ erreur: "reserve au formateur" }, 403);
  }
  const service = construireServiceComptes(c.env);
  const codesDeSecours = await service.regenererCodesDeSecours(session.id);
  return c.json({ codesDeSecours });
});

// Taxonomie du contenu, reservee au formateur (US-05). Domaines, puis filieres
// avec leurs trois niveaux d'office, puis notions a un niveau.
app.post("/formateur/domaines", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const { nom } = await c.req.json<{ nom: string }>();
  try {
    return c.json(await construireServiceContenu(c.env).creerDomaine(nom));
  } catch (e) {
    if (e instanceof ErreurContenu) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

app.get("/formateur/domaines", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  return c.json(await construireServiceContenu(c.env).domaines());
});

app.post("/formateur/filieres", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const { domaineId, nom } = await c.req.json<{ domaineId: string; nom: string }>();
  try {
    return c.json(await construireServiceContenu(c.env).creerFiliere(domaineId, nom));
  } catch (e) {
    if (e instanceof ErreurContenu) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

app.get("/formateur/filieres", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const domaineId = c.req.query("domaineId") ?? "";
  return c.json(await construireServiceContenu(c.env).filieresDuDomaine(domaineId));
});

app.get("/formateur/niveaux", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const filiereId = c.req.query("filiereId") ?? "";
  return c.json(await construireServiceContenu(c.env).niveauxDeFiliere(filiereId));
});

app.post("/formateur/notions", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const { niveauId, nom } = await c.req.json<{ niveauId: string; nom: string }>();
  try {
    return c.json(await construireServiceContenu(c.env).creerNotion(niveauId, nom));
  } catch (e) {
    if (e instanceof ErreurContenu) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

app.get("/formateur/notions", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const niveauId = c.req.query("niveauId") ?? "";
  return c.json(await construireServiceContenu(c.env).notionsDuNiveau(niveauId));
});

app.delete("/formateur/notions/:id", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  try {
    await construireServiceContenu(c.env).supprimerNotion(c.req.param("id"));
    return c.json({ ok: true });
  } catch (e) {
    if (e instanceof ErreurContenu) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

// Fils rouges, reserves au formateur (US-06).
app.post("/formateur/fils-rouges", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const { nom, description } = await c.req.json<{ nom: string; description?: string }>();
  try {
    return c.json(await construireServiceContenu(c.env).creerFilRouge(nom, description ?? ""));
  } catch (e) {
    if (e instanceof ErreurContenu) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

app.get("/formateur/fils-rouges", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  return c.json(await construireServiceContenu(c.env).filsRouges());
});

app.delete("/formateur/fils-rouges/:id", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  try {
    await construireServiceContenu(c.env).supprimerFilRouge(c.req.param("id"));
    return c.json({ ok: true });
  } catch (e) {
    if (e instanceof ErreurContenu) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

// Charge les exercices de la recette : taxonomie, fil rouge et cinq exercices.
// Reserve au formateur, idempotent.
app.post("/formateur/charger-recette", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const resultat = await chargerRecette({
    service: construireServiceContenu(c.env),
    depotContenu: construireDepotContenu(c.env),
    depotExercices: construireDepotExercices(c.env),
  });
  return c.json(resultat);
});

// Catalogue des exercices, reserve au formateur.
app.get("/formateur/exercices", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const tous = await construireDepotExercices(c.env).tous();
  return c.json(
    tous.map((e) => ({ identifiant: e.identifiant, titre: e.titre, type: e.contenu.type }))
  );
});

// Projection publique d'un exercice, sans la reponse attendue ni l'explication.
app.get("/exercices/:id/public", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const exercice = await construireDepotExercices(c.env).parIdentifiant(c.req.param("id"));
  if (!exercice) return c.json({ erreur: "exercice introuvable" }, 404);
  return c.json(projeter(exercice));
});

// Correction d'une reponse. Le serveur refuse tout envoi qui ne passe pas par la
// page : la session est exigee (critere 18).
app.post("/exercices/:id/reponse", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const exercice = await construireDepotExercices(c.env).parIdentifiant(c.req.param("id"));
  if (!exercice) return c.json({ erreur: "exercice introuvable" }, 404);
  const soumission = await c.req.json<Soumission>();
  try {
    return c.json(corriger(exercice, soumission));
  } catch {
    return c.json({ erreur: "reponse mal formee" }, 400);
  }
});

// Explication detaillee, affichee apres trois reponses fausses (section 4.3).
app.get("/exercices/:id/explication", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const exercice = await construireDepotExercices(c.env).parIdentifiant(c.req.param("id"));
  if (!exercice) return c.json({ erreur: "exercice introuvable" }, 404);
  return c.json({ explication: exercice.explicationDetaillee });
});

// Envoi d'une image par le formateur. Les octets sont dans le corps, le format
// et le texte alternatif en parametres. Range dans Workers KV (point 3.2).
app.post("/formateur/images", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const octets = await c.req.arrayBuffer();
  try {
    const image = await construireServiceImages(c.env).stocker(
      octets,
      c.req.query("format") as FormatImage,
      c.req.query("alt") ?? ""
    );
    return c.json(image);
  } catch (e) {
    if (e instanceof ErreurImage) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

// Affichage d'une image. Reserve a une session. Les SVG sont servis avec une
// politique qui bloque tout script, et sont affiches par une balise image.
app.get("/images/:cle", async (c) => {
  const session = await sessionActuelle(c);
  if (!session) return c.json({ erreur: "non connecte" }, 403);
  const image = await construireServiceImages(c.env).lire(c.req.param("cle"));
  if (!image) return c.json({ erreur: "image introuvable" }, 404);
  const entetes: Record<string, string> = {
    "content-type": typeMime(image.format),
    "cache-control": "private, max-age=3600",
    "x-content-type-options": "nosniff",
  };
  if (image.format === "svg") {
    entetes["content-security-policy"] = "script-src 'none'; sandbox";
  }
  return new Response(image.octets, { headers: entetes });
});

// Ecran "tester un exercice" (EM-CON-06), reserve au formateur.
app.get("/test-exercice", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return c.redirect("/");
  return c.html(PAGE_EXERCICE);
});

// Toutes les filieres, pour choisir celle d'un programme.
app.get("/formateur/filieres-toutes", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const filieres = await construireDepotContenu(c.env).filieresToutes();
  return c.json(filieres.map((f) => ({ id: f.id, nom: f.nom })));
});

// Programmes, reserves au formateur (US-07).
app.post("/formateur/programmes", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const corps = await c.req.json<{ nom: string; filiereId: string; filRougeId?: string | null }>();
  try {
    const programme = await construireServiceProgrammes(c.env).creerProgramme(
      corps.nom,
      corps.filiereId,
      corps.filRougeId ?? null
    );
    return c.json(programme);
  } catch (e) {
    if (e instanceof ErreurParcours) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

app.get("/formateur/programmes", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  return c.json(await construireServiceProgrammes(c.env).programmes());
});

// Detail d'un programme : sa filiere, son fil rouge, ses elements et les
// exercices ajoutables.
app.get("/formateur/programmes/:id", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const service = construireServiceProgrammes(c.env);
  const programme = await service.programmeParId(c.req.param("id"));
  if (!programme) return c.json({ erreur: "programme introuvable" }, 404);
  const contenu = construireDepotContenu(c.env);
  const filiere = await contenu.filiereParId(programme.filiereId);
  const filRouge = programme.filRougeId ? await contenu.filRougeParId(programme.filRougeId) : null;
  return c.json({
    programme,
    filiereNom: filiere?.nom ?? null,
    filRougeNom: filRouge?.nom ?? null,
    elements: await service.elementsDetailles(programme.id),
    ajoutables: await service.elementsAjoutables(programme.id),
  });
});

app.post("/formateur/programmes/:id/elements", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const { exerciceIdentifiant } = await c.req.json<{ exerciceIdentifiant: string }>();
  try {
    return c.json(
      await construireServiceProgrammes(c.env).ajouterElement(c.req.param("id"), exerciceIdentifiant)
    );
  } catch (e) {
    if (e instanceof ErreurParcours) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

app.delete("/formateur/programmes/elements/:elementId", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  try {
    await construireServiceProgrammes(c.env).retirerElement(c.req.param("elementId"));
    return c.json({ ok: true });
  } catch (e) {
    if (e instanceof ErreurParcours) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

app.post("/formateur/programmes/:id/ordre", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return s;
  const { ordre } = await c.req.json<{ ordre: string[] }>();
  try {
    await construireServiceProgrammes(c.env).reordonner(c.req.param("id"), ordre);
    return c.json({ ok: true });
  } catch (e) {
    if (e instanceof ErreurParcours) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

// Ecran de composition d'un programme, reserve au formateur.
app.get("/composer-programme", async (c) => {
  const s = await formateurOuRefus(c);
  if (s instanceof Response) return c.redirect("/");
  return c.html(PAGE_PROGRAMMES);
});

// Espace du formateur, protege par la session de role formateur. Sinon, retour
// a la page de connexion.
app.get("/formateur", async (c) => {
  const session = await sessionActuelle(c);
  if (!session || session.role !== "formateur") {
    return c.redirect("/");
  }
  return c.html(PAGE_FORMATEUR);
});

// Page de test de l'inscription et de la connexion.
app.get("/", (c) => c.html(PAGE_CONNEXION));

export default app;
