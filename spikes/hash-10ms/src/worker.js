// Spike A : cout du hachage PBKDF2 sur Cloudflare Workers,
// dans la limite de 10 ms de calcul par requete du plan gratuit.
//
// wallMs est le temps d'horloge, renvoye par le Worker.
// Le temps CPU, qui est la vraie limite des 10 ms, se lit dans les journaux
// (wrangler tail, ou Observability du tableau de bord Cloudflare).

const MDP = "Beek-Test-2026!";

async function mesurerHachage(iters) {
  const enc = new TextEncoder();
  const sel = crypto.getRandomValues(new Uint8Array(16));
  try {
    const cle = await crypto.subtle.importKey(
      "raw",
      enc.encode(MDP),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const t0 = performance.now();
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: sel, iterations: iters, hash: "SHA-256" },
      cle,
      256
    );
    const t1 = performance.now();
    return { iters, ok: true, wallMs: Number((t1 - t0).toFixed(3)) };
  } catch (e) {
    // PBKDF2 est peut-etre plafonne (100 000 iterations rapportees).
    // Au dela, deriveBits renvoie une erreur : c'est une mesure utile.
    return { iters, ok: false, erreur: String((e && e.message) || e) };
  }
}

export class HashDO {
  async fetch(request) {
    const url = new URL(request.url);
    const iters = parseInt(url.searchParams.get("iters") || "100000", 10);
    return Response.json(await mesurerHachage(iters));
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/hash") {
      const iters = parseInt(url.searchParams.get("iters") || "100000", 10);
      return Response.json(await mesurerHachage(iters));
    }

    if (url.pathname === "/hash-do") {
      const id = env.HASH_DO.idFromName("spike");
      return env.HASH_DO.get(id).fetch(request);
    }

    if (url.pathname === "/sweep") {
      const liste = (
        url.searchParams.get("iters") ||
        "10000,50000,100000,150000,200000,300000,600000"
      )
        .split(",")
        .map((s) => parseInt(s, 10));
      const resultats = [];
      for (const n of liste) resultats.push(await mesurerHachage(n));
      return Response.json({
        note: "wallMs = temps d'horloge. Lire le temps CPU dans les journaux.",
        resultats,
      });
    }

    return new Response(
      "Beek spike hachage. Routes : /hash?iters=N , /hash-do?iters=N , /sweep?iters=a,b,c",
      { headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  },
};
