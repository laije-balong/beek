// Lit le temps de calcul du serveur, mediane et 99e centile, sur la fenetre de la
// rafale, par l'API GraphQL d'analytique de Cloudflare. Le jeu de donnees est
// workersInvocationsAdaptive, les quantiles cpuTimeP50 et cpuTimeP99 sont en
// microsecondes (documentation Cloudflare). Ce script les convertit en
// millisecondes et les compare a la limite de 10 ms du plan gratuit.
//
// Echantillonnage adaptatif et delai de quelques minutes : attendez 3 a 5 minutes
// apres la rafale, puis lancez ce script. Les chiffres sont des estimations sur
// un echantillon, pas un releve exhaustif. Voir scripts/mesure-connexion.md.
//
// Usage :
//   CF_API_TOKEN=... CF_ACCOUNT_ID=... \
//   SCRIPT_NAME=beek \
//   DEBUT=2026-11-06T10:00:00Z FIN=2026-11-06T10:05:00Z \
//   node scripts/cpu-centiles.mjs

const CF_API_TOKEN = process.env.CF_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const SCRIPT_NAME = process.env.SCRIPT_NAME ?? "beek";
const DEBUT = process.env.DEBUT;
const FIN = process.env.FIN;

if (!CF_API_TOKEN || !CF_ACCOUNT_ID || !DEBUT || !FIN) {
  console.error("CF_API_TOKEN, CF_ACCOUNT_ID, DEBUT et FIN sont requis.");
  process.exit(1);
}

// Seuil dur du plan gratuit et marge de securite visee.
const LIMITE_MS = 10;
const MARGE_MS = 5;

const requete = `
query($compte: string!, $script: string!, $debut: Time!, $fin: Time!) {
  viewer {
    accounts(filter: { accountTag: $compte }) {
      workersInvocationsAdaptive(
        limit: 100,
        filter: { scriptName: $script, datetime_geq: $debut, datetime_leq: $fin }
        orderBy: [datetimeMinute_ASC]
      ) {
        dimensions { datetimeMinute }
        sum { requests errors }
        quantiles { cpuTimeP50 cpuTimeP99 }
      }
    }
  }
}`;

async function main() {
  const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      authorization: `Bearer ${CF_API_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: requete,
      variables: { compte: CF_ACCOUNT_ID, script: SCRIPT_NAME, debut: DEBUT, fin: FIN },
    }),
  });
  const d = await r.json();
  if (d.errors) {
    console.error("Erreur GraphQL :", JSON.stringify(d.errors, null, 2));
    process.exit(1);
  }
  const lignes = d.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive ?? [];
  if (lignes.length === 0) {
    console.error(
      "Aucune donnee sur cette fenetre. Attendez quelques minutes de plus, ou verifiez le nom du worker et les dates."
    );
    process.exit(1);
  }

  let pireP99 = 0;
  let totalRequetes = 0;
  console.log("");
  console.log("Minute                     requetes   p50 (ms)   p99 (ms)");
  for (const l of lignes) {
    const p50 = l.quantiles.cpuTimeP50 / 1000;
    const p99 = l.quantiles.cpuTimeP99 / 1000;
    totalRequetes += l.sum.requests;
    pireP99 = Math.max(pireP99, p99);
    console.log(
      `${l.dimensions.datetimeMinute}   ${String(l.sum.requests).padStart(8)}   ${p50
        .toFixed(2)
        .padStart(8)}   ${p99.toFixed(2).padStart(8)}`
    );
  }

  console.log("");
  console.log(`Requetes sur la fenetre : ${totalRequetes}`);
  console.log(`Pire 99e centile de temps de calcul : ${pireP99.toFixed(2)} ms`);
  console.log(`Limite du plan gratuit : ${LIMITE_MS} ms. Marge visee : ${MARGE_MS} ms.`);
  console.log("");

  if (pireP99 >= LIMITE_MS) {
    console.log(
      "VERDICT : DEPASSEMENT. Le 99e centile atteint ou depasse la limite. Arret et question au porteur, selon la regle de prudence."
    );
    process.exit(2);
  } else if (pireP99 >= MARGE_MS) {
    console.log(
      "VERDICT : sous la limite, mais la marge visee n'est pas tenue. A signaler au porteur avant la suite."
    );
  } else {
    console.log("VERDICT : sous la limite avec marge. Le seuil d'iteration 1 est tenu.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
