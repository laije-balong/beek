import { describe, it, expect } from "vitest";
import { ServiceComptes, NOMBRE_CODES_SECOURS } from "../../src/comptes/service";
import { DepotComptesMemoire } from "../../src/comptes/depot-memoire";
import { AuthHachagePartage } from "../../src/auth/hachage-partage";
import { ErreurCompte } from "../../src/comptes/types";
import { horlogeSysteme } from "../../src/comptes/temps";

// Simule le hachage lent du navigateur avec le sel du compte.
async function resultatNavigateur(motDePasse: string, sel: Uint8Array): Promise<Uint8Array> {
  const km = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(motDePasse),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: sel, iterations: 1000, hash: "SHA-256" },
    km,
    256
  );
  return new Uint8Array(bits);
}

function nouveauService() {
  const depot = new DepotComptesMemoire();
  const auth = new AuthHachagePartage("poivre-de-test");
  const service = new ServiceComptes(depot, auth, horlogeSysteme);
  return { service, depot, auth };
}

// Cree un formateur et rend le service, le depot, le compte et ses codes clairs.
async function formateurAvecCodes(email = "prof@exemple.fr") {
  const ctx = nouveauService();
  const { compte, codesDeSecours } = await ctx.service.creerCompte("Prof", email, "formateur");
  return { ...ctx, compte, codes: codesDeSecours };
}

describe("codes de secours du formateur (EM-ACC-13)", () => {
  it("cree cinq codes de secours lisibles pour un formateur (EM-ACC-13)", async () => {
    const { depot, compte, codes } = await formateurAvecCodes();
    expect(codes).toHaveLength(NOMBRE_CODES_SECOURS);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    }
    const enBase = await depot.parId(compte.id);
    expect(enBase?.codesDeSecours).toHaveLength(NOMBRE_CODES_SECOURS);
    expect(enBase?.codesDeSecours.every((c) => !c.consomme)).toBe(true);
  });

  it("ne cree aucun code de secours pour un apprenant (EM-ACC-13)", async () => {
    const { service } = nouveauService();
    const { compte, codesDeSecours } = await service.creerCompte("Awa", "awa@exemple.fr");
    expect(codesDeSecours).toHaveLength(0);
    expect(compte.codesDeSecours).toHaveLength(0);
  });

  it("ne stocke jamais le code en clair, seulement son verificateur (EM-ACC-13)", async () => {
    const { depot, auth, compte, codes } = await formateurAvecCodes();
    const enBase = await depot.parId(compte.id);
    const premier = enBase!.codesDeSecours[0];
    const normalise = codes[0].replace("-", "");
    expect(JSON.stringify(enBase)).not.toContain(normalise);
    expect(await auth.verifierSecret(normalise, premier.sel, premier.verificateur)).toBe(true);
  });

  it("recupere l'acces avec un code valide, qui est ensuite consomme (EM-ACC-13)", async () => {
    const { service, depot, auth, compte, codes } = await formateurAvecCodes();
    const nouveau = await resultatNavigateur("MonNouveauMotDePasse", compte.sel);
    const rendu = await service.utiliserCodeDeSecours("prof@exemple.fr", codes[0], nouveau);
    expect(rendu.statut).toBe("actif");
    const enBase = await depot.parId(compte.id);
    expect(await auth.verifier(nouveau, enBase!.verificateur)).toBe(true);
    expect(enBase!.codesDeSecours.filter((c) => c.consomme)).toHaveLength(1);
  });

  it("refuse un code de secours deja consomme (EM-ACC-13)", async () => {
    const { service, compte, codes } = await formateurAvecCodes();
    const nouveau = await resultatNavigateur("MotDePasseRecup", compte.sel);
    await service.utiliserCodeDeSecours("prof@exemple.fr", codes[0], nouveau);
    await expect(
      service.utiliserCodeDeSecours("prof@exemple.fr", codes[0], nouveau)
    ).rejects.toBeInstanceOf(ErreurCompte);
  });

  it("refuse un code de secours inconnu (EM-ACC-13)", async () => {
    const { service, compte } = await formateurAvecCodes();
    const nouveau = await resultatNavigateur("MotDePasseRecup", compte.sel);
    await expect(
      service.utiliserCodeDeSecours("prof@exemple.fr", "ZZZZZ-ZZZZZ", nouveau)
    ).rejects.toBeInstanceOf(ErreurCompte);
  });

  it("refuse la recuperation pour un compte apprenant (EM-ACC-13)", async () => {
    const { service } = nouveauService();
    const { compte } = await service.creerCompte("Awa", "awa@exemple.fr");
    const nouveau = await resultatNavigateur("MotDePasseRecup", compte.sel);
    await expect(
      service.utiliserCodeDeSecours("awa@exemple.fr", "AAAAA-BBBBB", nouveau)
    ).rejects.toBeInstanceOf(ErreurCompte);
  });

  it("tolere les tirets et la casse du code saisi (EM-ACC-13)", async () => {
    const { service, compte, codes } = await formateurAvecCodes();
    const nouveau = await resultatNavigateur("MotDePasseRecup", compte.sel);
    const saisi = codes[0].replace("-", "").toLowerCase();
    const rendu = await service.utiliserCodeDeSecours("prof@exemple.fr", saisi, nouveau);
    expect(rendu.statut).toBe("actif");
  });

  it("regenere les codes et rend les anciens caducs (EM-ACC-13)", async () => {
    const { service, compte, codes } = await formateurAvecCodes();
    const ancien = codes[0];
    const nouveauxCodes = await service.regenererCodesDeSecours(compte.id);
    expect(nouveauxCodes).toHaveLength(NOMBRE_CODES_SECOURS);
    expect(nouveauxCodes).not.toContain(ancien);
    const nouveau = await resultatNavigateur("MotDePasseRecup", compte.sel);
    await expect(
      service.utiliserCodeDeSecours("prof@exemple.fr", ancien, nouveau)
    ).rejects.toBeInstanceOf(ErreurCompte);
    const rendu = await service.utiliserCodeDeSecours("prof@exemple.fr", nouveauxCodes[0], nouveau);
    expect(rendu.statut).toBe("actif");
  });

  it("compte les codes de secours non consommes (EM-ACC-13)", async () => {
    const { service, compte, codes } = await formateurAvecCodes();
    expect(await service.codesDeSecoursRestants(compte.id)).toBe(NOMBRE_CODES_SECOURS);
    const nouveau = await resultatNavigateur("MotDePasseRecup", compte.sel);
    await service.utiliserCodeDeSecours("prof@exemple.fr", codes[0], nouveau);
    expect(await service.codesDeSecoursRestants(compte.id)).toBe(NOMBRE_CODES_SECOURS - 1);
  });
});
