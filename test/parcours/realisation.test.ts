import { describe, it, expect } from "vitest";
import { ServiceRealisation } from "../../src/parcours/service-realisation";
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
import type { Horloge } from "../../src/comptes/temps";
import type { Exercice } from "../../src/exercices/types";
import type { Soumission } from "../../src/exercices/correction";

// Exercice T02 dont la seule reponse juste est "ok". Toute autre reponse est fausse.
function exo(identifiant: string, notionId: string): Exercice {
  return {
    identifiant,
    nature: "exercice",
    titre: "Titre " + identifiant,
    notionId,
    filRougeId: null,
    dureeMinutes: 5,
    enonce: "Question",
    images: [],
    collageAutorise: true,
    indiceGenerique: "indice generique",
    explicationDetaillee: "explication detaillee de " + identifiant,
    contenu: { type: "T02", question: "Question", mode: "texte", reponsesAcceptees: ["ok"], erreursPrevues: [] },
  };
}

const juste: Soumission = { type: "T02", saisie: "ok" };
const faux: Soumission = { type: "T02", saisie: "non" };

// Horloge pilotee, pour verifier les dates et le temps passe.
function horlogePilotee(depart = 1000): Horloge & { avancer(ms: number): void } {
  let t = depart;
  return { maintenant: () => t, avancer: (ms: number) => { t += ms; } };
}

async function monter(horloge: Horloge) {
  const contenu = new DepotContenuMemoire();
  const serviceContenu = new ServiceContenu(contenu);
  const exercices = new DepotExercicesMemoire();
  const depotProgrammes = new DepotProgrammesMemoire();
  const servicePrg = new ServiceProgrammes(depotProgrammes, contenu, exercices);
  const comptes = new DepotComptesMemoire();
  const serviceComptes = new ServiceComptes(comptes, new AuthHachagePartage("poivre"), horloge);
  const depotAttr = new DepotAttributionsMemoire();
  const serviceAttr = new ServiceAttributions(depotAttr, depotProgrammes, comptes, horloge);
  const serviceReal = new ServiceRealisation(depotAttr, depotProgrammes, exercices, horloge);

  const dom = await serviceContenu.creerDomaine("Prog");
  const fil = await serviceContenu.creerFiliere(dom.id, "Python");
  const notion = await serviceContenu.creerNotion(fil.niveaux[0].id, "Boucle");
  for (const id of ["A", "B", "C"]) await exercices.creer(exo(id, notion.id));
  const prog = await servicePrg.creerProgramme("P", fil.filiere.id, null);
  for (const id of ["A", "B", "C"]) await servicePrg.ajouterElement(prog.id, id);
  const elements = await servicePrg.elementsDetailles(prog.id);
  const { compte: awa } = await serviceComptes.creerCompte("Awa", "awa@x.fr");
  const { compte: ben } = await serviceComptes.creerCompte("Ben", "ben@x.fr");
  await serviceAttr.attribuer(awa.id, prog.id);
  const attribution = (await serviceAttr.attributionsDeLApprenant(awa.id))[0];
  return { serviceReal, serviceAttr, depotAttr, attribution, elements, awa, ben };
}

async function statut(serviceAttr: ServiceAttributions, attributionId: string, elementId: string) {
  const progs = await serviceAttr.progressionsDeLAttribution(attributionId);
  return progs.find((p) => p.elementId === elementId);
}

describe("realisation d'un exercice (UC-05)", () => {
  it("ouvre l'element disponible : disponible devient en-cours (transition 7)", async () => {
    const h = horlogePilotee();
    const { serviceReal, serviceAttr, attribution, elements, awa } = await monter(h);
    const ouverture = await serviceReal.ouvrir(awa.id, elements[0].id);
    expect(ouverture.statut).toBe("en-cours");
    expect(ouverture.exercice.titre).toBe("Titre A");
    const p = await statut(serviceAttr, attribution.id, elements[0].id);
    expect(p?.statut).toBe("en-cours");
    expect(p?.dateOuverture).toBe(1000);
  });

  it("l'enonce public ne porte ni reponse attendue ni explication (EM-EXE-03, critere 7)", async () => {
    const h = horlogePilotee();
    const { serviceReal, elements, awa } = await monter(h);
    const ouverture = await serviceReal.ouvrir(awa.id, elements[0].id);
    const texte = JSON.stringify(ouverture.exercice);
    expect(texte).not.toContain("ok");
    expect(texte).not.toContain("explication detaillee");
  });

  it("refuse d'ouvrir un element verrouille (annexe B.2)", async () => {
    const h = horlogePilotee();
    const { serviceReal, elements, awa } = await monter(h);
    await expect(serviceReal.ouvrir(awa.id, elements[1].id)).rejects.toBeInstanceOf(ErreurParcours);
  });

  it("reponse juste : reussi avec XP (transition 8, RG-14) et deverrouillage du suivant (transition 5, RG-10)", async () => {
    const h = horlogePilotee();
    const { serviceReal, serviceAttr, attribution, elements, awa } = await monter(h);
    await serviceReal.ouvrir(awa.id, elements[0].id);
    h.avancer(2000);
    const r = await serviceReal.soumettre(awa.id, elements[0].id, juste);
    expect(r.juste).toBe(true);
    expect(r.statut).toBe("reussi");
    const p0 = await statut(serviceAttr, attribution.id, elements[0].id);
    expect(p0?.statut).toBe("reussi");
    expect(p0?.xpGagnes).toBe(true);
    expect(p0?.dateFin).toBe(3000);
    expect(p0?.tempsPasseMs).toBe(2000);
    const p1 = await statut(serviceAttr, attribution.id, elements[1].id);
    expect(p1?.statut).toBe("disponible");
    const p2 = await statut(serviceAttr, attribution.id, elements[2].id);
    expect(p2?.statut).toBe("verrouille");
  });

  it("reponse fausse : l'indice revient, la tentative est comptee (UC-05 A1)", async () => {
    const h = horlogePilotee();
    const { serviceReal, elements, awa } = await monter(h);
    await serviceReal.ouvrir(awa.id, elements[0].id);
    const r = await serviceReal.soumettre(awa.id, elements[0].id, faux);
    expect(r.juste).toBe(false);
    expect(r.indice).toBe("indice generique");
    expect(r.tentatives).toBe(1);
    expect(r.explicationDisponible).toBe(false);
    expect(r.statut).toBe("en-cours");
  });

  it("l'explication se debloque apres trois reponses fausses (RG-12, UC-05 A2)", async () => {
    const h = horlogePilotee();
    const { serviceReal, elements, awa } = await monter(h);
    await serviceReal.ouvrir(awa.id, elements[0].id);
    await serviceReal.soumettre(awa.id, elements[0].id, faux);
    await serviceReal.soumettre(awa.id, elements[0].id, faux);
    const r3 = await serviceReal.soumettre(awa.id, elements[0].id, faux);
    expect(r3.tentatives).toBe(3);
    expect(r3.explicationDisponible).toBe(true);
  });

  it("voir l'explication avant trois fausses est refuse (RG-12)", async () => {
    const h = horlogePilotee();
    const { serviceReal, elements, awa } = await monter(h);
    await serviceReal.ouvrir(awa.id, elements[0].id);
    await serviceReal.soumettre(awa.id, elements[0].id, faux);
    await expect(serviceReal.voirExplication(awa.id, elements[0].id)).rejects.toBeInstanceOf(ErreurParcours);
  });

  it("voir l'explication : reussi avec explication sans XP (transition 9) et deverrouillage du suivant", async () => {
    const h = horlogePilotee();
    const { serviceReal, serviceAttr, attribution, elements, awa } = await monter(h);
    await serviceReal.ouvrir(awa.id, elements[0].id);
    for (let i = 0; i < 3; i++) await serviceReal.soumettre(awa.id, elements[0].id, faux);
    const e = await serviceReal.voirExplication(awa.id, elements[0].id);
    expect(e.explication).toBe("explication detaillee de A");
    expect(e.statut).toBe("reussi-avec-explication");
    const p0 = await statut(serviceAttr, attribution.id, elements[0].id);
    expect(p0?.statut).toBe("reussi-avec-explication");
    expect(p0?.xpGagnes).toBe(false);
    const p1 = await statut(serviceAttr, attribution.id, elements[1].id);
    expect(p1?.statut).toBe("disponible");
  });

  it("un exercice termine se rouvre en lecture seule, avec l'explication debloquee (UC-05 A11, PS-05)", async () => {
    const h = horlogePilotee();
    const { serviceReal, elements, awa } = await monter(h);
    await serviceReal.ouvrir(awa.id, elements[0].id);
    for (let i = 0; i < 3; i++) await serviceReal.soumettre(awa.id, elements[0].id, faux);
    await serviceReal.voirExplication(awa.id, elements[0].id);
    const reouverture = await serviceReal.ouvrir(awa.id, elements[0].id);
    expect(reouverture.statut).toBe("reussi-avec-explication");
    expect(reouverture.explication).toBe("explication detaillee de A");
    // Plus aucune reponse n'est acceptee sur un exercice termine (PS-05).
    await expect(serviceReal.soumettre(awa.id, elements[0].id, juste)).rejects.toBeInstanceOf(ErreurParcours);
  });

  it("soumettre sans ouvrir est refuse", async () => {
    const h = horlogePilotee();
    const { serviceReal, elements, awa } = await monter(h);
    await expect(serviceReal.soumettre(awa.id, elements[0].id, juste)).rejects.toBeInstanceOf(ErreurParcours);
  });

  it("un apprenant n'accede pas a un element qui ne lui est pas attribue (ENF-05)", async () => {
    const h = horlogePilotee();
    const { serviceReal, elements, ben } = await monter(h);
    await expect(serviceReal.ouvrir(ben.id, elements[0].id)).rejects.toBeInstanceOf(ErreurParcours);
  });
});
