import type { Authentificateur } from "./types";

// Concatene deux tableaux d'octets.
function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

// Comparaison a temps constant, independante du contenu.
export function comparaisonConstante(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

// Sel aleatoire de 16 octets pour un nouveau compte.
export function genererSel(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

// Alphabet sans caracteres ambigus. 32 caracteres, diviseur de 256, donc un
// tirage par octet reste sans biais.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Mot de passe temporaire ou code de secours, a forte entropie, lisible sur un
// coupon. 12 caracteres sur 32 donnent environ 60 bits.
export function genererMotDePasseTemporaire(longueur = 12): string {
  const octets = crypto.getRandomValues(new Uint8Array(longueur));
  let s = "";
  for (let i = 0; i < longueur; i++) s += ALPHABET[octets[i] % ALPHABET.length];
  return s;
}

// Authentification par hachage partage, selon docs/exigences-techniques/authentification.md.
// Le navigateur fait le hachage lent. Cette classe fait le hachage rapide du
// serveur, un HMAC-SHA256 avec le poivre, puis compare a temps constant.
export class AuthHachagePartage implements Authentificateur {
  readonly #clePoivre: Promise<CryptoKey>;

  constructor(poivre: string) {
    this.#clePoivre = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(poivre),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
  }

  async #hmac(message: Uint8Array): Promise<Uint8Array> {
    const cle = await this.#clePoivre;
    const sig = await crypto.subtle.sign("HMAC", cle, message);
    return new Uint8Array(sig);
  }

  async preparerVerificateur(resultatNavigateur: Uint8Array): Promise<Uint8Array> {
    return this.#hmac(resultatNavigateur);
  }

  async verifier(resultatNavigateur: Uint8Array, verificateurStocke: Uint8Array): Promise<boolean> {
    const calcule = await this.preparerVerificateur(resultatNavigateur);
    return comparaisonConstante(calcule, verificateurStocke);
  }

  async preparerVerificateurSecret(secret: string, sel: Uint8Array): Promise<Uint8Array> {
    return this.#hmac(concat(sel, new TextEncoder().encode(secret)));
  }

  async verifierSecret(
    secret: string,
    sel: Uint8Array,
    verificateurStocke: Uint8Array
  ): Promise<boolean> {
    const calcule = await this.preparerVerificateurSecret(secret, sel);
    return comparaisonConstante(calcule, verificateurStocke);
  }

  async selPourAdresse(email: string, selConnu: Uint8Array | null): Promise<Uint8Array> {
    if (selConnu) return selConnu;
    return (await this.#hmac(new TextEncoder().encode("sel:" + email))).slice(0, 16);
  }
}
