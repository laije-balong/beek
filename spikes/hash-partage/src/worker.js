// Spike A2 : hachage partage, navigateur et serveur, avec poivre.
//
// Le navigateur fait le hachage lent, PBKDF2-SHA256 a 600 000 iterations.
// Le serveur ne fait qu'un hachage rapide, un HMAC avec un poivre tenu hors
// de la base, puis une comparaison a temps constant. Le CPU serveur reste donc
// petit, bien sous les 10 ms, meme en connexions rapprochees.

function concat(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function toHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex) {
  const out = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

// Comparaison a temps constant, independante du contenu.
function comparaisonConstante(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

let clePoivrePromise = null;
function getClePoivre(env) {
  if (!clePoivrePromise) {
    const enc = new TextEncoder();
    clePoivrePromise = crypto.subtle.importKey(
      "raw",
      enc.encode(env.PEPPER_TEST || "spike-poivre"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
  }
  return clePoivrePromise;
}

// Hachage rapide cote serveur : HMAC(poivre, sel || hachageNavigateur).
async function hachageServeur(env, sel, hachageNavigateur) {
  const cle = await getClePoivre(env);
  const sig = await crypto.subtle.sign("HMAC", cle, concat(sel, hachageNavigateur));
  return new Uint8Array(sig);
}

// Sel par compte. Pour une adresse inconnue, sel fictif stable derive du poivre,
// indiscernable d'un vrai sel, pour ne pas reveler quelles adresses ont un compte.
async function selPourAdresse(env, adresse) {
  const cle = await getClePoivre(env);
  const sig = await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode("sel:" + adresse));
  return new Uint8Array(sig).slice(0, 16);
}

// Donnees de test fixes pour le banc serveur.
const SEL_TEST = new Uint8Array(16).fill(7);
const HACHAGE_NAVIGATEUR_TEST = new Uint8Array(32).fill(42);

const PAGE = [
  "<!doctype html>",
  '<html lang="fr"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  "<title>Beek, mesure du hachage lent</title>",
  "<style>body{font-family:system-ui,sans-serif;margin:2rem;max-width:40rem}",
  "td,th{padding:.3rem .8rem;border-bottom:1px solid #ccc;text-align:left}",
  "button{padding:.6rem 1rem;font-size:1rem}</style></head><body>",
  "<h1>Beek, mesure du hachage lent</h1>",
  '<p>Appareil : <span id="ua"></span></p>',
  '<button id="go">Mesurer</button>',
  "<table><thead><tr><th>Iterations</th><th>Duree (ms)</th></tr></thead>",
  '<tbody id="rows"></tbody></table>',
  "<script>",
  "document.getElementById('ua').textContent = navigator.userAgent;",
  "var ITERS = [100000, 300000, 600000, 1000000];",
  "async function pbkdf2(iters){",
  "  var enc = new TextEncoder();",
  "  var sel = crypto.getRandomValues(new Uint8Array(16));",
  "  var km = await crypto.subtle.importKey('raw', enc.encode('MotDePasseDeTest-2026'), 'PBKDF2', false, ['deriveBits']);",
  "  var t0 = performance.now();",
  "  await crypto.subtle.deriveBits({name:'PBKDF2', salt:sel, iterations:iters, hash:'SHA-256'}, km, 256);",
  "  return performance.now() - t0;",
  "}",
  "document.getElementById('go').onclick = async function(){",
  "  var rows = document.getElementById('rows'); rows.innerHTML = '';",
  "  for (var k=0;k<ITERS.length;k++){",
  "    var n = ITERS[k], s = 0;",
  "    for (var i=0;i<3;i++) s += await pbkdf2(n);",
  "    var ms = Math.round(s/3);",
  "    var tr = document.createElement('tr');",
  "    tr.innerHTML = '<td>'+n.toLocaleString('fr')+'</td><td>'+ms+'</td>';",
  "    rows.appendChild(tr);",
  "  }",
  "};",
  "</scr" + "ipt></body></html>",
].join("\n");

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Page de mesure du hachage lent, a ouvrir sur ordinateur et sur telephone.
    if (url.pathname === "/") {
      return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    // Demonstration du sel, identique en forme pour une adresse connue ou inconnue.
    if (url.pathname === "/salt") {
      const adresse = url.searchParams.get("email") || "inconnu@example.com";
      const sel = await selPourAdresse(env, adresse);
      return Response.json({ email: adresse, saltHex: toHex(sel) });
    }

    // Banc du chemin serveur de la verification : un HMAC avec poivre et une
    // comparaison a temps constant. C'est ce qu'on mesure en charge.
    if (url.pathname === "/verify-bench") {
      const stocke = await hachageServeur(env, SEL_TEST, HACHAGE_NAVIGATEUR_TEST);
      const calcule = await hachageServeur(env, SEL_TEST, HACHAGE_NAVIGATEUR_TEST);
      return Response.json({ ok: comparaisonConstante(stocke, calcule) });
    }

    return new Response(
      "Beek spike hachage partage. Routes : / , /salt?email= , /verify-bench",
      { headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  },
};
