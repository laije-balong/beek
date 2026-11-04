import { describe, it, expect } from "vitest";
import {
  AuthHachagePartage,
  comparaisonConstante,
  genererSel,
} from "../../src/auth/hachage-partage";

const POIVRE = "poivre-de-test";

// Simule le hachage lent du navigateur. Iterations basses pour un test rapide.
// La valeur ne change pas les proprietes verifiees ici.
async function pbkdf2Navigateur(
  motDePasse: string,
  sel: Uint8Array,
  iterations = 1000
): Promise<Uint8Array> {
  const km = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(motDePasse),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: sel, iterations, hash: "SHA-256" },
    km,
    256
  );
  return new Uint8Array(bits);
}

function hex(a: Uint8Array): string {
  return Array.from(a)
    .map((o) => o.toString(16).padStart(2, "0"))
    .join("");
}

describe("authentification par hachage partage", () => {
  it("verifie un resultat correct et rejette un faux (ET-AUTH-03)", async () => {
    const auth = new AuthHachagePartage(POIVRE);
    const sel = genererSel();
    const bon = await pbkdf2Navigateur("MonMotDePasse", sel);
    const verificateur = await auth.preparerVerificateur(bon);
    expect(await auth.verifier(bon, verificateur)).toBe(true);
    const mauvais = await pbkdf2Navigateur("AutreMotDePasse", sel);
    expect(await auth.verifier(mauvais, verificateur)).toBe(false);
  });

  it("deux comptes au meme mot de passe donnent deux verificateurs differents (US-02 CA2)", async () => {
    const auth = new AuthHachagePartage(POIVRE);
    const r1 = await pbkdf2Navigateur("MemeMotDePasse", genererSel());
    const r2 = await pbkdf2Navigateur("MemeMotDePasse", genererSel());
    const v1 = await auth.preparerVerificateur(r1);
    const v2 = await auth.preparerVerificateur(r2);
    expect(hex(v1)).not.toBe(hex(v2));
  });

  it("ne stocke pas le resultat du navigateur en clair (US-02 CA1)", async () => {
    const auth = new AuthHachagePartage(POIVRE);
    const r = await pbkdf2Navigateur("MonMotDePasse", genererSel());
    const v = await auth.preparerVerificateur(r);
    expect(hex(v)).not.toBe(hex(r));
  });

  it("renvoie un sel fictif stable pour une adresse inconnue (ET-AUTH-08)", async () => {
    const auth = new AuthHachagePartage(POIVRE);
    const s1 = await auth.selPourAdresse("inconnu@exemple.fr", null);
    const s2 = await auth.selPourAdresse("inconnu@exemple.fr", null);
    const s3 = await auth.selPourAdresse("autre@exemple.fr", null);
    expect(hex(s1)).toBe(hex(s2));
    expect(hex(s1)).not.toBe(hex(s3));
    expect(s1.length).toBe(16);
  });

  it("renvoie le sel reel quand le compte existe (ET-AUTH-08)", async () => {
    const auth = new AuthHachagePartage(POIVRE);
    const selConnu = genererSel();
    const rendu = await auth.selPourAdresse("a@exemple.fr", selConnu);
    expect(hex(rendu)).toBe(hex(selConnu));
  });

  it("compare a temps constant", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 3]);
    const c = new Uint8Array([1, 2, 4]);
    const d = new Uint8Array([1, 2]);
    expect(comparaisonConstante(a, b)).toBe(true);
    expect(comparaisonConstante(a, c)).toBe(false);
    expect(comparaisonConstante(a, d)).toBe(false);
  });
});
