import { Hono } from "hono";

const app = new Hono();

// Route de sante, pour verifier que le socle repond.
app.get("/sante", (c) => c.json({ ok: true, service: "beek" }));

// Page d'accueil provisoire du socle.
app.get("/", (c) =>
  c.html(
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      "<title>Beek</title></head><body><h1>Beek</h1>" +
      "<p>Socle en place. Les fonctions arrivent par iterations.</p>" +
      "</body></html>"
  )
);

export default app;
