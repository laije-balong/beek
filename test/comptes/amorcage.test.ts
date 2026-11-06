import { describe, it, expect } from "vitest";
import { ServiceComptes, NOMBRE_CODES_SECOURS } from "../../src/comptes/service";
import { DepotComptesMemoire } from "../../src/comptes/depot-memoire";
import { AuthHachagePartage } from "../../src/auth/hachage-partage";
import { ErreurCompte } from "../../src/comptes/types";
import { horlogeSysteme } from "../../src/comptes/temps";

function nouveauService() {
  const depot = new DepotComptesMemoire();
  const auth = new AuthHachagePartage("poivre-de-test");
  const service = new ServiceComptes(depot, auth, horlogeSysteme);
  return { service, depot };
}

describe("amorcage du premier formateur", () => {
  it("amorce un formateur avec ses codes quand aucun n'existe (EM-ACC-01, EM-ACC-13)", async () => {
    const { service } = nouveauService();
    const { compte, motDePasseTemporaire, codesDeSecours } = await service.amorcerFormateur(
      "Prof",
      "prof@exemple.fr"
    );
    expect(compte.role).toBe("formateur");
    expect(compte.statut).toBe("en-attente-activation");
    expect(motDePasseTemporaire).toHaveLength(12);
    expect(codesDeSecours).toHaveLength(NOMBRE_CODES_SECOURS);
  });

  it("refuse l'amorcage si un formateur existe deja", async () => {
    const { service } = nouveauService();
    await service.amorcerFormateur("Prof", "prof@exemple.fr");
    await expect(service.amorcerFormateur("Autre", "autre@exemple.fr")).rejects.toBeInstanceOf(
      ErreurCompte
    );
  });

  it("existeFormateur ne voit pas les apprenants", async () => {
    const { service, depot } = nouveauService();
    expect(await depot.existeFormateur()).toBe(false);
    await service.creerCompte("Awa", "awa@exemple.fr");
    expect(await depot.existeFormateur()).toBe(false);
    await service.amorcerFormateur("Prof", "prof@exemple.fr");
    expect(await depot.existeFormateur()).toBe(true);
  });
});
