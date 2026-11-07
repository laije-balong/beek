import { describe, it, expect } from "vitest";
import { chargerRecette } from "../../src/exercices/seed-recette";
import { ServiceContenu } from "../../src/contenu/service";
import { DepotContenuMemoire } from "../../src/contenu/depot-memoire";
import { DepotExercicesMemoire } from "../../src/exercices/depot-memoire";

function dependances() {
  const depotContenu = new DepotContenuMemoire();
  const service = new ServiceContenu(depotContenu);
  const depotExercices = new DepotExercicesMemoire();
  return { service, depotContenu, depotExercices };
}

describe("chargement de la recette", () => {
  it("met en place la taxonomie et charge les cinq exercices", async () => {
    const d = dependances();
    const r = await chargerRecette(d);
    expect(r.erreurs).toEqual([]);
    expect(r.charges).toHaveLength(5);
    expect(await d.depotExercices.tous()).toHaveLength(5);
    expect((await d.depotContenu.domaines()).map((x) => x.nom)).toContain("Formation programmation");
    // Les references sont resolues : le slug a laisse place a un identifiant reel.
    const bin = await d.depotExercices.parIdentifiant("MACH-DEC-S08E03");
    expect(bin?.notionId).not.toBe("mach-s8");
    expect(bin?.notionId).toBeTruthy();
    const ordre = await d.depotExercices.parIdentifiant("LOGI-DEC-S03E03");
    expect(ordre?.filRougeId).not.toBe("cyber-mwinda");
    expect(ordre?.filRougeId).toBeTruthy();
  });

  it("est idempotent : relance sans doublon", async () => {
    const d = dependances();
    await chargerRecette(d);
    const r2 = await chargerRecette(d);
    expect(r2.erreurs).toEqual([]);
    expect(r2.charges).toHaveLength(5);
    expect(await d.depotExercices.tous()).toHaveLength(5);
    const domaine = await d.depotContenu.domaineParNom("Formation programmation");
    const filieres = await d.depotContenu.filieresDuDomaine(domaine!.id);
    expect(filieres.filter((f) => f.nom === "Logique et résolution de problèmes")).toHaveLength(1);
  });

  it("une notion chargee compte bien son exercice (garde US-05 CA4)", async () => {
    const d = dependances();
    await chargerRecette(d);
    const bin = await d.depotExercices.parIdentifiant("MACH-DEC-S08E03");
    expect(await d.depotExercices.nombreParNotion(bin!.notionId)).toBe(1);
  });
});
