import { describe, it, expect } from "vitest";
import {
  AuthHachagePartage,
  genererSel,
  genererMotDePasseTemporaire,
} from "../../src/auth/hachage-partage";

const POIVRE = "poivre-de-test";

function hex(a: Uint8Array): string {
  return Array.from(a)
    .map((o) => o.toString(16).padStart(2, "0"))
    .join("");
}

describe("secrets produits par le serveur", () => {
  it("verifie un mot de passe temporaire correct et rejette un faux (ET-AUTH-15)", async () => {
    const auth = new AuthHachagePartage(POIVRE);
    const sel = genererSel();
    const temp = genererMotDePasseTemporaire();
    const v = await auth.preparerVerificateurSecret(temp, sel);
    expect(await auth.verifierSecret(temp, sel, v)).toBe(true);
    expect(await auth.verifierSecret("MAUVAISCODE", sel, v)).toBe(false);
  });

  it("deux sels donnent deux verificateurs differents pour le meme secret (ET-AUTH-15)", async () => {
    const auth = new AuthHachagePartage(POIVRE);
    const temp = genererMotDePasseTemporaire();
    const v1 = await auth.preparerVerificateurSecret(temp, genererSel());
    const v2 = await auth.preparerVerificateurSecret(temp, genererSel());
    expect(hex(v1)).not.toBe(hex(v2));
  });

  it("le mot de passe temporaire a la bonne forme", () => {
    const temp = genererMotDePasseTemporaire();
    expect(temp).toHaveLength(12);
    expect(temp).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
    expect(genererMotDePasseTemporaire()).not.toBe(genererMotDePasseTemporaire());
  });
});
