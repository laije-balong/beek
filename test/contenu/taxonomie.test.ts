import { describe, it, expect } from "vitest";
import { ServiceContenu } from "../../src/contenu/service";
import { DepotContenuMemoire } from "../../src/contenu/depot-memoire";
import { ErreurContenu, NOMS_NIVEAUX } from "../../src/contenu/types";

function nouveauService() {
  const depot = new DepotContenuMemoire();
  const service = new ServiceContenu(depot);
  return { service, depot };
}

describe("taxonomie du contenu (US-05)", () => {
  it("cree un domaine et numerote l'ordre (US-05)", async () => {
    const { service } = nouveauService();
    const a = await service.creerDomaine("Programmation et langages");
    const b = await service.creerDomaine("Bureautique");
    expect(a.ordre).toBe(0);
    expect(b.ordre).toBe(1);
    expect((await service.domaines()).map((d) => d.nom)).toEqual([
      "Programmation et langages",
      "Bureautique",
    ]);
  });

  it("refuse un domaine sans nom (US-05)", async () => {
    const { service } = nouveauService();
    await expect(service.creerDomaine("   ")).rejects.toBeInstanceOf(ErreurContenu);
  });

  it("refuse deux domaines du meme nom (US-05)", async () => {
    const { service } = nouveauService();
    await service.creerDomaine("Python");
    await expect(service.creerDomaine("Python")).rejects.toBeInstanceOf(ErreurContenu);
  });

  it("cree une filiere avec ses trois niveaux dans l'ordre (US-05 CA1, PS-12)", async () => {
    const { service } = nouveauService();
    const d = await service.creerDomaine("Programmation et langages");
    const { filiere, niveaux } = await service.creerFiliere(d.id, "Python");
    expect(filiere.nom).toBe("Python");
    expect(niveaux.map((n) => n.nom)).toEqual([...NOMS_NIVEAUX]);
    expect(niveaux.map((n) => n.ordre)).toEqual([0, 1, 2]);
    const relus = await service.niveauxDeFiliere(filiere.id);
    expect(relus.map((n) => n.nom)).toEqual(["Découverte", "Fondamentaux", "Intermédiaire"]);
  });

  it("refuse une filiere inconnue de domaine et un nom vide (US-05)", async () => {
    const { service } = nouveauService();
    await expect(service.creerFiliere("inexistant", "Python")).rejects.toBeInstanceOf(ErreurContenu);
    const d = await service.creerDomaine("Programmation");
    await expect(service.creerFiliere(d.id, "  ")).rejects.toBeInstanceOf(ErreurContenu);
  });

  it("refuse deux filieres du meme nom dans un domaine, mais l'autorise ailleurs (US-05)", async () => {
    const { service } = nouveauService();
    const d1 = await service.creerDomaine("Programmation");
    const d2 = await service.creerDomaine("Data");
    await service.creerFiliere(d1.id, "Python");
    await expect(service.creerFiliere(d1.id, "Python")).rejects.toBeInstanceOf(ErreurContenu);
    const ailleurs = await service.creerFiliere(d2.id, "Python");
    expect(ailleurs.filiere.nom).toBe("Python");
  });

  it("les niveaux sont exactement trois, sans ajout ni retrait possible (US-05 CA3)", async () => {
    const { service } = nouveauService();
    const d = await service.creerDomaine("Programmation");
    const { filiere } = await service.creerFiliere(d.id, "Python");
    const niveaux = await service.niveauxDeFiliere(filiere.id);
    // Aucune methode du service ne cree, ne retire ni ne renomme un niveau.
    expect(niveaux).toHaveLength(3);
    expect("creerNiveau" in service).toBe(false);
    expect("supprimerNiveau" in service).toBe(false);
    expect("renommerNiveau" in service).toBe(false);
  });

  it("cree une notion a un niveau (US-05 CA2)", async () => {
    const { service } = nouveauService();
    const d = await service.creerDomaine("Programmation");
    const { niveaux } = await service.creerFiliere(d.id, "Python");
    const fondamentaux = niveaux.find((n) => n.nom === "Fondamentaux")!;
    const notion = await service.creerNotion(fondamentaux.id, "Boucle for");
    expect(notion.nom).toBe("Boucle for");
    expect(notion.niveauId).toBe(fondamentaux.id);
    const liste = await service.notionsDuNiveau(fondamentaux.id);
    expect(liste.map((n) => n.nom)).toEqual(["Boucle for"]);
  });

  it("refuse deux notions du meme nom a un niveau (US-05)", async () => {
    const { service } = nouveauService();
    const d = await service.creerDomaine("Programmation");
    const { niveaux } = await service.creerFiliere(d.id, "Python");
    const niveau = niveaux[0];
    await service.creerNotion(niveau.id, "Boucle for");
    await expect(service.creerNotion(niveau.id, "Boucle for")).rejects.toBeInstanceOf(ErreurContenu);
  });

  it("refuse de supprimer une notion utilisee par des exercices, avec le nombre (US-05 CA4)", async () => {
    const { service, depot } = nouveauService();
    const d = await service.creerDomaine("Programmation");
    const { niveaux } = await service.creerFiliere(d.id, "Python");
    const notion = await service.creerNotion(niveaux[0].id, "Boucle for");
    depot.simulerExercices(notion.id, 3);
    await expect(service.supprimerNotion(notion.id)).rejects.toThrow(/3 exercices/);
  });

  it("supprime une notion sans exercice (US-05)", async () => {
    const { service } = nouveauService();
    const d = await service.creerDomaine("Programmation");
    const { niveaux } = await service.creerFiliere(d.id, "Python");
    const notion = await service.creerNotion(niveaux[0].id, "Boucle for");
    await service.supprimerNotion(notion.id);
    expect(await service.notionsDuNiveau(niveaux[0].id)).toHaveLength(0);
  });
});
