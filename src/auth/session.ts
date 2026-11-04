import type { Role } from "../comptes/types";
import { comparaisonConstante } from "./hachage-partage";

// Duree d'une session. Une inactivite de 2 heures la fait expirer (US-01, RG-07).
export const DUREE_SESSION = 2 * 60 * 60 * 1000;

interface ContenuSession {
  id: string;
  role: Role;
  exp: number;
}

function base64urlEncode(octets: Uint8Array): string {
  let s = "";
  for (let i = 0; i < octets.length; i++) s += String.fromCharCode(octets[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(texte: string): Uint8Array {
  const s = atob(texte.replace(/-/g, "+").replace(/_/g, "/"));
  const o = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i);
  return o;
}

// Signe et verifie un jeton de session, porte par un cookie. Le jeton contient
// l'identifiant, le role et une date d'expiration, et une signature HMAC qui
// empeche toute modification cote client.
export class SignataireSession {
  readonly #cle: Promise<CryptoKey>;

  constructor(secret: string) {
    this.#cle = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
  }

  async #signer(message: Uint8Array): Promise<Uint8Array> {
    const cle = await this.#cle;
    return new Uint8Array(await crypto.subtle.sign("HMAC", cle, message));
  }

  async creer(id: string, role: Role, maintenant: number): Promise<string> {
    const contenu: ContenuSession = { id, role, exp: maintenant + DUREE_SESSION };
    const chargeB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(contenu)));
    const sig = await this.#signer(new TextEncoder().encode(chargeB64));
    return chargeB64 + "." + base64urlEncode(sig);
  }

  async lire(jeton: string, maintenant: number): Promise<{ id: string; role: Role } | null> {
    const points = jeton.split(".");
    if (points.length !== 2) return null;
    const chargeB64 = points[0];
    let sigRecue: Uint8Array;
    try {
      sigRecue = base64urlDecode(points[1]);
    } catch {
      return null;
    }
    const sigCalculee = await this.#signer(new TextEncoder().encode(chargeB64));
    if (!comparaisonConstante(sigCalculee, sigRecue)) return null;
    let contenu: ContenuSession;
    try {
      contenu = JSON.parse(new TextDecoder().decode(base64urlDecode(chargeB64)));
    } catch {
      return null;
    }
    if (typeof contenu.exp !== "number" || maintenant > contenu.exp) return null;
    return { id: contenu.id, role: contenu.role };
  }
}
