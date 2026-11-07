// Chargement des exercices de la recette dans Beek. Il met en place la taxonomie
// et le fil rouge attendus, resout les references des exercices, verifie leur
// coherence (section 6), puis les enregistre. Idempotent : relancable sans
// doublon, car il retrouve ce qui existe deja et remplace les exercices.

import type { ServiceContenu } from "../contenu/service";
import type { DepotContenu } from "../contenu/depot";
import type { DepotExercices } from "./depot";
import { controlesCoherence, messageErreur } from "./controles";
import { EXERCICES_RECETTE, TAXONOMIE_RECETTE } from "./donnees/recette";
import type { Exercice } from "./types";

export interface DependancesRecette {
  service: ServiceContenu;
  depotContenu: DepotContenu;
  depotExercices: DepotExercices;
}

export interface ResultatChargement {
  charges: string[];
  erreurs: string[];
}

export async function chargerRecette(deps: DependancesRecette): Promise<ResultatChargement> {
  const { service, depotContenu, depotExercices } = deps;

  // 1. Taxonomie. On retrouve ce qui existe, on cree ce qui manque, et on note la
  // correspondance slug vers identifiant reel.
  const idParSlug = new Map<string, string>();

  const domaine =
    (await depotContenu.domaineParNom(TAXONOMIE_RECETTE.domaine)) ??
    (await service.creerDomaine(TAXONOMIE_RECETTE.domaine));

  for (const f of TAXONOMIE_RECETTE.filieres) {
    const filiere =
      (await depotContenu.filiereParNomDansDomaine(domaine.id, f.nom)) ??
      (await service.creerFiliere(domaine.id, f.nom)).filiere;
    const niveaux = await depotContenu.niveauxDeFiliere(filiere.id);
    for (const n of f.notions) {
      const niveau = niveaux.find((x) => x.nom === n.niveau);
      if (!niveau) throw new Error(`niveau introuvable : ${n.niveau}`);
      const notion =
        (await depotContenu.notionParNomDansNiveau(niveau.id, n.nom)) ??
        (await service.creerNotion(niveau.id, n.nom));
      idParSlug.set(n.slug, notion.id);
    }
  }

  for (const fr of TAXONOMIE_RECETTE.filsRouges) {
    const filRouge =
      (await depotContenu.filRougeParNom(fr.nom)) ??
      (await service.creerFilRouge(fr.nom, fr.description));
    idParSlug.set(fr.slug, filRouge.id);
  }

  // 2. Exercices. On resout les references, on controle, on enregistre.
  const charges: string[] = [];
  const erreurs: string[] = [];
  for (const source of EXERCICES_RECETTE) {
    const notionId = idParSlug.get(source.notionId);
    if (!notionId) {
      erreurs.push(`${source.identifiant} : notion inconnue (${source.notionId})`);
      continue;
    }
    const filRougeId =
      source.filRougeId === null ? null : idParSlug.get(source.filRougeId) ?? null;
    if (source.filRougeId !== null && filRougeId === null) {
      erreurs.push(`${source.identifiant} : fil rouge inconnu (${source.filRougeId})`);
      continue;
    }
    const exercice: Exercice = { ...structuredClone(source), notionId, filRougeId };
    const probleme = controlesCoherence(exercice);
    if (probleme.length > 0) {
      erreurs.push(...probleme.map(messageErreur));
      continue;
    }
    await depotExercices.remplacer(exercice);
    charges.push(exercice.identifiant);
  }

  return { charges, erreurs };
}
