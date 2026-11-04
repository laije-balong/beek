import { describe, it, expect } from "vitest";
import { ServiceComptes } from "../../src/comptes/service";
import { DepotComptesMemoire } from "../../src/comptes/depot-memoire";
import { AuthHachagePartage } from "../../src/auth/hachage-partage";
import { ErreurCompte } from "../../src/comptes/types";
import { type Horloge, SEPT_JOURS } from "../../src/comptes/temps";

function horlogeFixe(depart: number): Horloge & { avancer(ms: number): void } {
  let t = depart;
  return {
    maintenant: () => t,
    avancer: (ms: number) => {
      t += ms;
    },
  };
}

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

const CONSENT_OK = { seizeAns: true, traitementDonnees: true };

function nouveauService(horloge: Horloge) {
  const depot = new DepotComptesMemoire();
  const auth = new AuthHachagePartage("poivre-de-test");
  const service = new ServiceComptes(depot, auth, horloge);
  return { service, depot, auth };
}

describe("comptes : creation et activation", () => {
  it("cree un compte en attente d'activation avec un mot de passe temporaire (UC-02, EM-ACC-04)", async () => {
    const { service } = nouveauService(horlogeFixe(1_000_000));
    const { compte, motDePasseTemporaire } = await service.creerCompte("Awa", "awa@exemple.fr");
    expect(compte.statut).toBe("en-attente-activation");
    expect(motDePasseTemporaire).toHaveLength(12);
    expect(compte.expirationMotDePasseTemporaire).toBe(1_000_000 + SEPT_JOURS);
  });

  it("refuse une adresse invalide (UC-02 A2)", async () => {
    const { service } = nouveauService(horlogeFixe(0));
    await expect(service.creerCompte("X", "pas-une-adresse")).rejects.toBeInstanceOf(ErreurCompte);
  });

  it("refuse une adresse deja utilisee, meme en casse differente (RG-02, UC-02 A3)", async () => {
    const { service } = nouveauService(horlogeFixe(0));
    await service.creerCompte("Awa", "awa@exemple.fr");
    await expect(service.creerCompte("Autre", "AWA@exemple.fr")).rejects.toBeInstanceOf(ErreurCompte);
  });

  it("active le compte avec le bon mot de passe temporaire et le consentement (UC-03)", async () => {
    const { service, depot, auth } = nouveauService(horlogeFixe(1_000_000));
    const { compte, motDePasseTemporaire } = await service.creerCompte("Awa", "awa@exemple.fr");
    const resultat = await resultatNavigateur("MonMotDePasse", compte.sel);
    await service.activer("awa@exemple.fr", motDePasseTemporaire, resultat, CONSENT_OK);
    const apres = await depot.parEmail("awa@exemple.fr");
    expect(apres?.statut).toBe("actif");
    expect(apres?.dateActivation).toBe(1_000_000);
    expect(apres?.dateConsentement).toBe(1_000_000);
    expect(apres?.expirationMotDePasseTemporaire).toBeNull();
    expect(await auth.verifier(resultat, apres!.verificateur)).toBe(true);
  });

  it("refuse l'activation si le mot de passe temporaire a expire (UC-03 A1, RG-05)", async () => {
    const h = horlogeFixe(1_000_000);
    const { service } = nouveauService(h);
    const { compte, motDePasseTemporaire } = await service.creerCompte("Awa", "awa@exemple.fr");
    const resultat = await resultatNavigateur("MonMotDePasse", compte.sel);
    h.avancer(SEPT_JOURS + 1);
    await expect(
      service.activer("awa@exemple.fr", motDePasseTemporaire, resultat, CONSENT_OK)
    ).rejects.toBeInstanceOf(ErreurCompte);
  });

  it("refuse l'activation avec un mauvais mot de passe temporaire (UC-03)", async () => {
    const { service } = nouveauService(horlogeFixe(1_000_000));
    const { compte } = await service.creerCompte("Awa", "awa@exemple.fr");
    const resultat = await resultatNavigateur("MonMotDePasse", compte.sel);
    await expect(
      service.activer("awa@exemple.fr", "MAUVAISCODEXX", resultat, CONSENT_OK)
    ).rejects.toBeInstanceOf(ErreurCompte);
  });

  it("refuse l'activation sans consentement complet (CNF-01, RG-04)", async () => {
    const { service } = nouveauService(horlogeFixe(1_000_000));
    const { compte, motDePasseTemporaire } = await service.creerCompte("Awa", "awa@exemple.fr");
    const resultat = await resultatNavigateur("MonMotDePasse", compte.sel);
    await expect(
      service.activer("awa@exemple.fr", motDePasseTemporaire, resultat, {
        seizeAns: true,
        traitementDonnees: false,
      })
    ).rejects.toBeInstanceOf(ErreurCompte);
  });
});
