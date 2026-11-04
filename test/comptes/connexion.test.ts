import { describe, it, expect } from "vitest";
import { ServiceComptes } from "../../src/comptes/service";
import { DepotComptesMemoire } from "../../src/comptes/depot-memoire";
import { AuthHachagePartage } from "../../src/auth/hachage-partage";
import { ErreurCompte } from "../../src/comptes/types";
import { type Horloge, QUINZE_MINUTES } from "../../src/comptes/temps";

function horlogeFixe(depart: number): Horloge & { avancer(ms: number): void } {
  let t = depart;
  return {
    maintenant: () => t,
    avancer: (ms: number) => {
      t += ms;
    },
  };
}

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

function nouveauService(horloge: Horloge) {
  const depot = new DepotComptesMemoire();
  const service = new ServiceComptes(depot, new AuthHachagePartage("poivre-de-test"), horloge);
  return { service, depot };
}

async function creerEtActiver(
  service: ServiceComptes,
  depot: DepotComptesMemoire,
  email: string,
  motDePasse: string
) {
  const { compte, motDePasseTemporaire } = await service.creerCompte("Awa", email);
  const resultat = await resultatNavigateur(motDePasse, compte.sel);
  await service.activer(email, motDePasseTemporaire, resultat, {
    seizeAns: true,
    traitementDonnees: true,
  });
  const actif = await depot.parEmail(email);
  return actif!;
}

describe("comptes : connexion et reinitialisation", () => {
  it("connecte un compte actif avec le bon mot de passe (EM-ACC-06)", async () => {
    const { service, depot } = nouveauService(horlogeFixe(1_000_000));
    const actif = await creerEtActiver(service, depot, "awa@exemple.fr", "BonMotDePasse");
    const bon = await resultatNavigateur("BonMotDePasse", actif.sel);
    const compte = await service.connexion("awa@exemple.fr", bon);
    expect(compte.statut).toBe("actif");
  });

  it("refuse un mauvais mot de passe", async () => {
    const { service, depot } = nouveauService(horlogeFixe(1_000_000));
    const actif = await creerEtActiver(service, depot, "awa@exemple.fr", "BonMotDePasse");
    const mauvais = await resultatNavigateur("MauvaisMotDePasse", actif.sel);
    await expect(service.connexion("awa@exemple.fr", mauvais)).rejects.toBeInstanceOf(ErreurCompte);
  });

  it("bloque apres 5 echecs puis debloque apres 15 minutes (RG-06)", async () => {
    const h = horlogeFixe(1_000_000);
    const { service, depot } = nouveauService(h);
    const actif = await creerEtActiver(service, depot, "awa@exemple.fr", "BonMotDePasse");
    const mauvais = await resultatNavigateur("MauvaisMotDePasse", actif.sel);
    const bon = await resultatNavigateur("BonMotDePasse", actif.sel);
    for (let i = 0; i < 5; i++) {
      await expect(service.connexion("awa@exemple.fr", mauvais)).rejects.toBeInstanceOf(ErreurCompte);
    }
    await expect(service.connexion("awa@exemple.fr", bon)).rejects.toBeInstanceOf(ErreurCompte);
    h.avancer(QUINZE_MINUTES);
    const compte = await service.connexion("awa@exemple.fr", bon);
    expect(compte.statut).toBe("actif");
    expect(compte.echecsConnexion).toBe(0);
  });

  it("reinitialise vers un mot de passe temporaire et le statut mot de passe a changer (UC-09)", async () => {
    const { service, depot } = nouveauService(horlogeFixe(1_000_000));
    await creerEtActiver(service, depot, "awa@exemple.fr", "BonMotDePasse");
    const { motDePasseTemporaire } = await service.reinitialiser("awa@exemple.fr");
    expect(motDePasseTemporaire).toHaveLength(12);
    const compte = await depot.parEmail("awa@exemple.fr");
    expect(compte?.statut).toBe("mot-de-passe-a-changer");
  });

  it("plafonne les reinitialisations a 5 par jour et repart le lendemain (RG-29)", async () => {
    const h = horlogeFixe(Date.UTC(2026, 10, 4, 8, 0, 0));
    const { service, depot } = nouveauService(h);
    await creerEtActiver(service, depot, "awa@exemple.fr", "BonMotDePasse");
    for (let i = 0; i < 5; i++) {
      await service.reinitialiser("awa@exemple.fr");
    }
    await expect(service.reinitialiser("awa@exemple.fr")).rejects.toBeInstanceOf(ErreurCompte);
    h.avancer(24 * 60 * 60 * 1000);
    const { motDePasseTemporaire } = await service.reinitialiser("awa@exemple.fr");
    expect(motDePasseTemporaire).toHaveLength(12);
  });

  it("la reinitialisation leve le blocage et le nouveau mot de passe fonctionne (PS-10, UC-09)", async () => {
    const h = horlogeFixe(1_000_000);
    const { service, depot } = nouveauService(h);
    const actif = await creerEtActiver(service, depot, "awa@exemple.fr", "BonMotDePasse");
    const mauvais = await resultatNavigateur("Mauvais", actif.sel);
    for (let i = 0; i < 5; i++) {
      await expect(service.connexion("awa@exemple.fr", mauvais)).rejects.toBeInstanceOf(ErreurCompte);
    }
    const { motDePasseTemporaire } = await service.reinitialiser("awa@exemple.fr");
    const apresReinit = await depot.parEmail("awa@exemple.fr");
    expect(apresReinit?.finBlocage).toBeNull();
    expect(apresReinit?.echecsConnexion).toBe(0);
    const nouveauResultat = await resultatNavigateur("NouveauMotDePasse", apresReinit!.sel);
    await service.changerMotDePasse("awa@exemple.fr", motDePasseTemporaire, nouveauResultat);
    const apres = await depot.parEmail("awa@exemple.fr");
    expect(apres?.statut).toBe("actif");
    const bon = await resultatNavigateur("NouveauMotDePasse", apres!.sel);
    const connecte = await service.connexion("awa@exemple.fr", bon);
    expect(connecte.statut).toBe("actif");
  });
});
