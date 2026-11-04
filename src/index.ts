import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import {
  construireServiceComptes,
  construireSignataireSession,
  type Env,
} from "./fabrique";
import { ErreurCompte } from "./comptes/types";
import { DUREE_SESSION } from "./auth/session";
import { toHex, fromHex } from "./util/hex";
import { PAGE_CONNEXION } from "./page-connexion";

type Bindings = Env & { AUTORISER_SEED?: string };

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
  return c.json({ nom: compte.nom, role: compte.role });
});

// Deconnexion.
app.post("/auth/deconnexion", (c) => {
  deleteCookie(c, "session", { path: "/" });
  return c.json({ ok: true });
});

// Creation d'un apprenant de test. Reservee au developpement, gardee par une
// variable d'environnement. En production, cette variable n'existe pas.
app.post("/dev/creer-apprenant", async (c) => {
  if (c.env.AUTORISER_SEED !== "1") return c.json({ erreur: "indisponible" }, 404);
  const corps = await c.req.json<{ email: string; nom: string }>();
  const service = construireServiceComptes(c.env);
  try {
    const { motDePasseTemporaire } = await service.creerCompte(corps.nom, corps.email);
    return c.json({ email: corps.email, motDePasseTemporaire });
  } catch (e) {
    if (e instanceof ErreurCompte) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

// Bootstrap d'un formateur de test. Reserve au developpement.
app.post("/dev/creer-formateur", async (c) => {
  if (c.env.AUTORISER_SEED !== "1") return c.json({ erreur: "indisponible" }, 404);
  const corps = await c.req.json<{ email: string; nom: string }>();
  const service = construireServiceComptes(c.env);
  try {
    const { motDePasseTemporaire } = await service.creerCompte(corps.nom, corps.email, "formateur");
    return c.json({ email: corps.email, motDePasseTemporaire });
  } catch (e) {
    if (e instanceof ErreurCompte) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

// Creation d'un apprenant par le formateur. Reservee au role formateur.
app.post("/formateur/apprenants", async (c) => {
  const jeton = getCookie(c, "session");
  const session = jeton
    ? await construireSignataireSession(c.env).lire(jeton, Date.now())
    : null;
  if (!session || session.role !== "formateur") {
    return c.json({ erreur: "reserve au formateur" }, 403);
  }
  const corps = await c.req.json<{ email: string; nom: string }>();
  const service = construireServiceComptes(c.env);
  try {
    const { motDePasseTemporaire } = await service.creerCompte(corps.nom, corps.email, "apprenant");
    return c.json({ nom: corps.nom, email: corps.email, motDePasseTemporaire });
  } catch (e) {
    if (e instanceof ErreurCompte) return c.json({ erreur: e.message }, 400);
    throw e;
  }
});

// Page de test de l'inscription et de la connexion.
app.get("/", (c) => c.html(PAGE_CONNEXION));

export default app;
