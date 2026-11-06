// Rafale de connexions rapprochees, pour la mesure du temps de calcul du serveur
// sur la connexion complete (plan du lot 1, iteration 1). Ce script tire le sel,
// calcule le resultat du hachage lent du navigateur avec PBKDF2 a 600 000
// iterations, verifie une premiere connexion, puis envoie N connexions en
// parallele borne. Il affiche la latence cote client, mediane et 99e centile, et
// la fenetre de temps a interroger ensuite.
//
// La latence cote client n'est PAS le temps de calcul du serveur. Le temps de
// calcul, borne a 10 ms par requete sur le plan gratuit, se lit apres la rafale
// avec scripts/cpu-centiles.mjs ou sur le tableau de bord. Voir
// scripts/mesure-connexion.md.
//
// Usage :
//   BASE=https://beek.exemple.workers.dev \
//   EMAIL=prof@beek.local MOTDEPASSE=MonMotDePasse \
//   N=500 CONCURRENCE=25 node scripts/mesure-connexion.mjs

import { pbkdf2 } from "node:crypto";

const BASE = (process.env.BASE ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const EMAIL = process.env.EMAIL;
const MOTDEPASSE = process.env.MOTDEPASSE;
const N = Number(process.env.N ?? 500);
const CONCURRENCE = Number(process.env.CONCURRENCE ?? 25);

if (!EMAIL || !MOTDEPASSE) {
  console.error("EMAIL et MOTDEPASSE sont requis.");
  process.exit(1);
}

function deriver(motDePasse, sel) {
  return new Promise((resoudre, rejeter) => {
    pbkdf2(Buffer.from(motDePasse, "utf8"), sel, 600000, 32, "sha256", (e, dk) =>
      e ? rejeter(e) : resoudre(dk)
    );
  });
}

async function selPour(email) {
  const r = await fetch(`${BASE}/auth/sel?email=${encodeURIComponent(email)}`);
  if (!r.ok) throw new Error(`sel: HTTP ${r.status}`);
  const d = await r.json();
  return Buffer.from(d.selHex, "hex");
}

// Une connexion. Renvoie la duree cote client en millisecondes et le succes.
async function connexion(resultatHex) {
  const debut = performance.now();
  const r = await fetch(`${BASE}/auth/connexion`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, resultatHex }),
  });
  await r.text();
  return { ms: performance.now() - debut, ok: r.ok };
}

function centile(valeursTriees, p) {
  if (valeursTriees.length === 0) return NaN;
  const rang = Math.ceil((p / 100) * valeursTriees.length) - 1;
  return valeursTriees[Math.min(rang, valeursTriees.length - 1)];
}

async function main() {
  const sel = await selPour(EMAIL);
  const resultatHex = (await deriver(MOTDEPASSE, sel)).toString("hex");

  // Verification prealable : une connexion doit reussir, sinon on s'arrete pour
  // ne pas bloquer le compte apres 5 echecs (RG-06).
  const essai = await connexion(resultatHex);
  if (!essai.ok) {
    console.error(
      "La connexion de verification a echoue. Verifiez l'adresse et le mot de passe. Rien n'est envoye, pour ne pas bloquer le compte."
    );
    process.exit(1);
  }

  const latences = [];
  let echecs = 0;
  let suivant = 0;
  const debutRafale = Date.now();

  async function ouvrier() {
    while (true) {
      const i = suivant++;
      if (i >= N) return;
      const r = await connexion(resultatHex);
      latences.push(r.ms);
      if (!r.ok) echecs++;
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCE }, () => ouvrier()));
  const finRafale = Date.now();

  latences.sort((a, b) => a - b);
  const mediane = centile(latences, 50);
  const p99 = centile(latences, 99);

  // Fenetre a interroger, elargie de 60 secondes de chaque cote, en UTC.
  const debutFenetre = new Date(debutRafale - 60000).toISOString();
  const finFenetre = new Date(finRafale + 60000).toISOString();

  console.log("");
  console.log(`Connexions envoyees : ${N}, echecs : ${echecs}`);
  console.log(`Duree de la rafale : ${((finRafale - debutRafale) / 1000).toFixed(1)} s`);
  console.log("");
  console.log("Latence cote client, aller-retour reseau compris (indicative) :");
  console.log(`  mediane : ${mediane.toFixed(1)} ms`);
  console.log(`  99e centile : ${p99.toFixed(1)} ms`);
  console.log("");
  console.log("Le temps de CALCUL du serveur se lit maintenant, sur cette fenetre UTC :");
  console.log(`  DEBUT=${debutFenetre}`);
  console.log(`  FIN=${finFenetre}`);
  console.log("");
  console.log("Puis : voir scripts/mesure-connexion.md pour lire cpuTimeP50 et cpuTimeP99.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
