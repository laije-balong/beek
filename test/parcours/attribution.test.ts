import { describe, it, expect } from "vitest";
import { ServiceAttributions } from "../../src/parcours/service-attribution";
import { DepotAttributionsMemoire } from "../../src/parcours/depot-attribution-memoire";
import { ServiceProgrammes } from "../../src/parcours/service";
import { DepotProgrammesMemoire } from "../../src/parcours/depot-memoire";
import { ErreurParcours } from "../../src/parcours/types";
import { ServiceContenu } from "../../src/contenu/service";
import { DepotContenuMemoire } from "../../src/contenu/depot-memoire";
import { DepotExercicesMemoire } from "../../src/exercices/depot-memoire";
import { ServiceComptes } from "../../src/comptes/service";
import { DepotComptesMemoire } from "../../src/comptes/depot-memoire";
import { AuthHachagePartage } from "../../src/auth/hachage-partage";
import { horlogeSysteme } from "../../src/comptes/temps";
import type { Exercice } from "../../src/exercices/types";

function exo(identifiant: string, notionId: string): Exercice {
  return {
    identifiant,
    nature: "exercice",
    titre: identifiant,
    notionId,
    filRougeId: null,
    dureeMinutes: 5,
    enonce: "q",
    images: [],
    collageAutorise: true,
    indiceGenerique: "g",
    explicationDetaillee: "e",
    contenu: { type: "T02", question: "q", mode: "texte", reponsesAcceptees: ["x"], erreursPrevues: [] },
  };
}

async function monter() {
  const contenu = new DepotContenuMemoire();
  const serviceContenu = new ServiceContenu(contenu);
  const exercices = new DepotExercicesMemoire();
  const depotProgrammes = new DepotProgrammesMemoire();
  const servicePrg = new ServiceProgrammes(depotProgrammes, contenu, exercices);
  const comptes = new DepotComptesMemoire();
  const serviceComptes = new ServiceComptes(comptes, new AuthHachagePartage("poivre"), horlogeSysteme);
  const serviceAttr = new ServiceAttributions(
    new DepotAttributionsMemoire(),
    depotProgrammes,
    comptes,
    horlogeSysteme
  );

  const dom = await serviceContenu.creerDomaine("Prog");
  const fil = await serviceContenu.creerFiliere(dom.id, "Python");
  const notion = await serviceContenu.creerNotion(fil.niveaux[0].id, "Boucle");
  for (const id of ["A", "B", "C"]) await exercices.creer(exo(id, notion.id));
  const prog = await servicePrg.creerProgramme("P", fil.filiere.id, null);
  for (const id of ["A", "B", "C"]) await servicePrg.ajouterElement(prog.id, id);
  const elements = await servicePrg.elementsDetailles(prog.id);
  const { compte: awa } = await serviceComptes.creerCompte("Awa", "awa@x.fr");
  const { compte: ben } = await serviceComptes.creerCompte("Ben", "ben@x.fr");
  return { serviceAttr, prog, elements, awa, ben };
}

function statutsParElement(progs: { elementId: string; statut: string }[]) {
  return Object.fromEntries(progs.map((p) => [p.elementId, p.statut]));
}

describe("attribution d'un programme (UC-04)", () => {
  it("rend disponible l'element de depart et verrouille les suivants (annexe B.2)", async () => {
    const { serviceAttr, prog, elements, awa } = await monter();
    const a = await serviceAttr.attribuer(awa.id, prog.id);
    const m = statutsParElement(await serviceAttr.progressionsDeLAttribution(a.id));
    expect(m[elements[0].id]).toBe("disponible");
    expect(m[elements[1].id]).toBe("verrouille");
    expect(m[elements[2].id]).toBe("verrouille");
  });

  it("point de depart au milieu : les precedents passent par le formateur (UC-04 A1, PS-03)", async () => {
    const { serviceAttr, prog, elements, awa } = await monter();
    const a = await serviceAttr.attribuer(awa.id, prog.id, elements[1].id);
    const m = statutsParElement(await serviceAttr.progressionsDeLAttribution(a.id));
    expect(m[elements[0].id]).toBe("passe-par-le-formateur");
    expect(m[elements[1].id]).toBe("disponible");
    expect(m[elements[2].id]).toBe("verrouille");
  });

  it("refuse un programme deja attribue a cet apprenant (UC-04 A3)", async () => {
    const { serviceAttr, prog, awa } = await monter();
    await serviceAttr.attribuer(awa.id, prog.id);
    await expect(serviceAttr.attribuer(awa.id, prog.id)).rejects.toBeInstanceOf(ErreurParcours);
  });

  it("le meme programme s'attribue a deux apprenants differents", async () => {
    const { serviceAttr, prog, awa, ben } = await monter();
    await serviceAttr.attribuer(awa.id, prog.id);
    const a2 = await serviceAttr.attribuer(ben.id, prog.id);
    expect(a2.apprenantId).toBe(ben.id);
  });

  it("refuse un apprenant inconnu et un element de depart inconnu", async () => {
    const { serviceAttr, prog, awa } = await monter();
    await expect(serviceAttr.attribuer("inconnu", prog.id)).rejects.toBeInstanceOf(ErreurParcours);
    await expect(serviceAttr.attribuer(awa.id, prog.id, "element-inconnu")).rejects.toBeInstanceOf(
      ErreurParcours
    );
  });
});
