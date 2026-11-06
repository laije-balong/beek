import { describe, it, expect } from "vitest";
import { ServiceContenu } from "../../src/contenu/service";
import { DepotContenuMemoire } from "../../src/contenu/depot-memoire";
import { ErreurContenu } from "../../src/contenu/types";

function nouveauService() {
  const depot = new DepotContenuMemoire();
  const service = new ServiceContenu(depot);
  return { service, depot };
}

describe("fils rouges (US-06)", () => {
  it("cree un fil rouge avec sa description (US-06 CA1)", async () => {
    const { service } = nouveauService();
    const fr = await service.creerFilRouge("Cyber Mwinda", "Cybercafe fictif de Brazzaville");
    expect(fr.nom).toBe("Cyber Mwinda");
    expect(fr.description).toBe("Cybercafe fictif de Brazzaville");
    expect((await service.filsRouges()).map((f) => f.nom)).toEqual(["Cyber Mwinda"]);
  });

  it("refuse un fil rouge sans nom (US-06)", async () => {
    const { service } = nouveauService();
    await expect(service.creerFilRouge("  ", "x")).rejects.toBeInstanceOf(ErreurContenu);
  });

  it("refuse deux fils rouges du meme nom (US-06)", async () => {
    const { service } = nouveauService();
    await service.creerFilRouge("Cyber Mwinda", "");
    await expect(service.creerFilRouge("Cyber Mwinda", "")).rejects.toBeInstanceOf(ErreurContenu);
  });

  it("supprime un fil rouge inutilise (US-06)", async () => {
    const { service } = nouveauService();
    const fr = await service.creerFilRouge("Logivia", "");
    await service.supprimerFilRouge(fr.id);
    expect(await service.filsRouges()).toHaveLength(0);
  });

  it("refuse de supprimer un fil rouge utilise, avec le nombre (US-06 CA3)", async () => {
    const { service, depot } = nouveauService();
    const fr = await service.creerFilRouge("Cyber Mwinda", "");
    depot.simulerElementsFilRouge(fr.id, 4);
    await expect(service.supprimerFilRouge(fr.id)).rejects.toThrow(/4 elements/);
  });
});
