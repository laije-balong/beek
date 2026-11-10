import { describe, it, expect } from "vitest";
import { ServiceProgrammes } from "../../src/parcours/service";
import { DepotProgrammesMemoire } from "../../src/parcours/depot-memoire";
import { ErreurParcours } from "../../src/parcours/types";
import { ServiceContenu } from "../../src/contenu/service";
import { DepotContenuMemoire } from "../../src/contenu/depot-memoire";
import { DepotExercicesMemoire } from "../../src/exercices/depot-memoire";
import type { Exercice, NatureExercice } from "../../src/exercices/types";

function exo(
  identifiant: string,
  notionId: string,
  filRougeId: string | null,
  nature: NatureExercice = "exercice"
): Exercice {
  return {
    identifiant,
    nature,
    titre: identifiant,
    notionId,
    filRougeId,
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
  const service = new ServiceProgrammes(new DepotProgrammesMemoire(), contenu, exercices);

  const dom = await serviceContenu.creerDomaine("Programmation");
  const python = await serviceContenu.creerFiliere(dom.id, "Python");
  const sql = await serviceContenu.creerFiliere(dom.id, "SQL");
  const notionPy = await serviceContenu.creerNotion(python.niveaux[0].id, "Boucle");
  const notionSql = await serviceContenu.creerNotion(sql.niveaux[0].id, "Jointure");
  const logivia = await serviceContenu.creerFilRouge("Logivia", "");
  const autre = await serviceContenu.creerFilRouge("Autre", "");

  await exercices.creer(exo("PY-SANS", notionPy.id, null));
  await exercices.creer(exo("PY-LOG", notionPy.id, logivia.id));
  await exercices.creer(exo("PY-AUTRE", notionPy.id, autre.id));
  await exercices.creer(exo("SQL-SANS", notionSql.id, null));
  await exercices.creer(exo("PY-ETAPE", notionPy.id, null, "etape-de-defi"));

  const programme = await service.creerProgramme("Python Logivia", python.filiere.id, logivia.id);
  return { service, programme };
}

describe("composition d'un programme (US-07)", () => {
  it("n'offre que les exercices de la filiere, sans fil rouge ou du bon fil rouge (CA2, CA4)", async () => {
    const { service, programme } = await monter();
    const ids = (await service.elementsAjoutables(programme.id)).map((e) => e.identifiant).sort();
    expect(ids).toEqual(["PY-LOG", "PY-SANS"]);
  });

  it("refuse un exercice d'une autre filiere ou d'un autre fil rouge, meme envoye direct (CA3)", async () => {
    const { service, programme } = await monter();
    await expect(service.ajouterElement(programme.id, "SQL-SANS")).rejects.toBeInstanceOf(
      ErreurParcours
    );
    await expect(service.ajouterElement(programme.id, "PY-AUTRE")).rejects.toBeInstanceOf(
      ErreurParcours
    );
    await expect(service.ajouterElement(programme.id, "PY-ETAPE")).rejects.toBeInstanceOf(
      ErreurParcours
    );
    expect(await service.elementsDetailles(programme.id)).toHaveLength(0);
  });

  it("ajoute, retire ne laisse plus l'exercice dans les ajoutables", async () => {
    const { service, programme } = await monter();
    await service.ajouterElement(programme.id, "PY-SANS");
    const ajoutables = (await service.elementsAjoutables(programme.id)).map((e) => e.identifiant);
    expect(ajoutables).not.toContain("PY-SANS");
    expect(ajoutables).toContain("PY-LOG");
  });

  it("refuse deux fois le meme exercice", async () => {
    const { service, programme } = await monter();
    await service.ajouterElement(programme.id, "PY-SANS");
    await expect(service.ajouterElement(programme.id, "PY-SANS")).rejects.toBeInstanceOf(
      ErreurParcours
    );
  });

  it("change l'ordre des elements (CA1)", async () => {
    const { service, programme } = await monter();
    const e1 = await service.ajouterElement(programme.id, "PY-SANS");
    const e2 = await service.ajouterElement(programme.id, "PY-LOG");
    await service.reordonner(programme.id, [e2.id, e1.id]);
    const ordre = (await service.elementsDetailles(programme.id)).map((e) => e.exerciceIdentifiant);
    expect(ordre).toEqual(["PY-LOG", "PY-SANS"]);
  });

  it("refuse un ordre qui ne reprend pas exactement les elements", async () => {
    const { service, programme } = await monter();
    const e1 = await service.ajouterElement(programme.id, "PY-SANS");
    await expect(service.reordonner(programme.id, [e1.id, "inconnu"])).rejects.toBeInstanceOf(
      ErreurParcours
    );
  });
});
