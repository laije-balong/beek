import { Hono } from "hono";
import { construireServiceComptes, type Env } from "./fabrique";
import { ErreurCompte } from "./comptes/types";
import { toHex, fromHex } from "./util/hex";
import { PAGE_CONNEXION } from "./page-connexion";

type Bindings = Env & { AUTORISER_SEED?: string };

const app = new Hono<{ Bindings: Bindings }>();

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

// Connexion d'un compte actif.
app.post("/auth/connexion", async (c) => {
  const corps = await c.req.json<{ email: string; resultatHex: string }>();
  const service = construireServiceComptes(c.env);
  try {
    const compte = await service.connexion(corps.email, fromHex(corps.resultatHex));
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

// Page de test de l'inscription et de la connexion.
app.get("/", (c) => c.html(PAGE_CONNEXION));

export default app;
