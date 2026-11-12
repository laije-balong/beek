import type { DepotAttributions } from "./depot-attribution";
import type { DepotProgrammes } from "./depot";
import type { DepotExercices } from "../exercices/depot";
import type { Horloge } from "../comptes/temps";
import { corriger, type Soumission, type Resultat } from "../exercices/correction";
import { projeter, type ExercicePublic } from "../exercices/projection";
import { ErreurParcours, type ProgressionElement, type StatutElement } from "./types";

// Realisation d'un exercice par l'apprenant (UC-05). Ouverture d'un element,
// correction cote serveur, comptage des tentatives, deblocage de l'explication
// apres trois reponses fausses, reussite et deverrouillage de l'element suivant.
// Les statuts et transitions suivent l'annexe B.2. La reponse attendue et
// l'explication non debloquee ne quittent jamais le serveur (EM-EXE-03, critere 7).

// RG-12 : l'explication detaillee se debloque apres trois reponses fausses.
const SEUIL_EXPLICATION = 3;

export interface EtatRealisation {
  statut: StatutElement;
  tentatives: number; // nombre de reponses fausses
  explicationDisponible: boolean;
}

export interface OuvertureElement extends EtatRealisation {
  exercice: ExercicePublic;
  // Presente seulement si l'exercice est deja reussi avec explication, pour la
  // reouverture en lecture seule (UC-05 A11, PS-05).
  explication?: string;
}

export interface ResultatExplication extends EtatRealisation {
  explication: string;
}

export interface ResultatSoumission extends EtatRealisation {
  juste: boolean;
  indice: string | null;
}

export class ServiceRealisation {
  readonly #attributions: DepotAttributions;
  readonly #programmes: DepotProgrammes;
  readonly #exercices: DepotExercices;
  readonly #horloge: Horloge;

  constructor(
    attributions: DepotAttributions,
    programmes: DepotProgrammes,
    exercices: DepotExercices,
    horloge: Horloge
  ) {
    this.#attributions = attributions;
    this.#programmes = programmes;
    this.#exercices = exercices;
    this.#horloge = horloge;
  }

  // Ouvre un element. Transition 7 : disponible devient en-cours a la premiere
  // ouverture. Rend la projection publique de l'exercice, sans reponse attendue.
  async ouvrir(apprenantId: string, elementId: string): Promise<OuvertureElement> {
    const { element, progression } = await this.#contexte(apprenantId, elementId);
    if (progression.statut === "verrouille") {
      throw new ErreurParcours("element verrouille");
    }
    const exercice = await this.#exercices.parIdentifiant(element.exerciceIdentifiant);
    if (!exercice) throw new ErreurParcours("exercice introuvable");
    if (progression.statut === "disponible") {
      progression.statut = "en-cours";
      progression.dateOuverture = this.#horloge.maintenant();
      await this.#attributions.mettreAJourProgression(progression);
    }
    const ouverture: OuvertureElement = {
      exercice: projeter(exercice),
      ...this.#etat(progression),
    };
    // A la reouverture d'un exercice reussi avec explication, on renvoie aussi
    // l'explication, affichee en lecture seule (UC-05 A11, PS-05).
    if (progression.statut === "reussi-avec-explication") {
      ouverture.explication = exercice.explicationDetaillee;
    }
    return ouverture;
  }

  // Corrige une soumission. Juste : transition 8, reussi avec les XP (RG-14), et
  // deverrouillage de l'element suivant (transition 5, RG-10). Faux : la tentative
  // est comptee (RG-12).
  async soumettre(
    apprenantId: string,
    elementId: string,
    soumission: Soumission
  ): Promise<ResultatSoumission> {
    const { element, attribution, progression } = await this.#contexte(apprenantId, elementId);
    if (progression.statut !== "en-cours") {
      throw new ErreurParcours("element non ouvert");
    }
    const exercice = await this.#exercices.parIdentifiant(element.exerciceIdentifiant);
    if (!exercice) throw new ErreurParcours("exercice introuvable");
    let resultat: Resultat;
    try {
      resultat = corriger(exercice, soumission);
    } catch {
      throw new ErreurParcours("reponse mal formee");
    }
    if (resultat.juste) {
      await this.#terminer(attribution.id, progression, "reussi", true);
    } else {
      progression.reponsesFausses += 1;
      await this.#attributions.mettreAJourProgression(progression);
    }
    return { juste: resultat.juste, indice: resultat.indice, ...this.#etat(progression) };
  }

  // Voir l'explication (UC-05 A2 et A3, PS-04). Le clic, confirme cote navigateur
  // sans XP, revele l'explication et, du meme coup, passe l'exercice en reussi
  // avec explication (transition 9) et deverrouille le suivant. Servie seulement
  // apres trois reponses fausses (RG-12).
  async voirExplication(apprenantId: string, elementId: string): Promise<ResultatExplication> {
    const { element, attribution, progression } = await this.#contexte(apprenantId, elementId);
    if (progression.statut !== "en-cours") {
      throw new ErreurParcours("element non ouvert");
    }
    if (progression.reponsesFausses < SEUIL_EXPLICATION) {
      throw new ErreurParcours("explication non debloquee");
    }
    const exercice = await this.#exercices.parIdentifiant(element.exerciceIdentifiant);
    if (!exercice) throw new ErreurParcours("exercice introuvable");
    progression.dateExplication = this.#horloge.maintenant();
    await this.#terminer(attribution.id, progression, "reussi-avec-explication", false);
    return { explication: exercice.explicationDetaillee, ...this.#etat(progression) };
  }

  // Resout la progression de l'apprenant pour un element : element, programme,
  // attribution de l'apprenant, puis progression. L'apprenant n'accede qu'a ses
  // propres donnees (ENF-05).
  async #contexte(apprenantId: string, elementId: string) {
    const element = await this.#programmes.elementParId(elementId);
    if (!element) throw new ErreurParcours("element introuvable");
    const attribution = await this.#attributions.attributionParApprenantEtProgramme(
      apprenantId,
      element.programmeId
    );
    if (!attribution) throw new ErreurParcours("element non attribue");
    const progression = await this.#attributions.progressionParElement(attribution.id, elementId);
    if (!progression) throw new ErreurParcours("progression introuvable");
    return { element, attribution, progression };
  }

  // Marque la progression comme terminee : statut, XP, date de fin et temps passe,
  // puis deverrouille l'element suivant (transition 5, RG-10).
  async #terminer(
    attributionId: string,
    progression: ProgressionElement,
    statut: StatutElement,
    xp: boolean
  ): Promise<void> {
    const maintenant = this.#horloge.maintenant();
    progression.statut = statut;
    progression.xpGagnes = xp;
    progression.dateFin = maintenant;
    if (progression.dateOuverture !== null) {
      progression.tempsPasseMs = maintenant - progression.dateOuverture;
    }
    await this.#attributions.mettreAJourProgression(progression);
    await this.#deverrouillerSuivant(attributionId, progression.elementId);
  }

  async #deverrouillerSuivant(attributionId: string, elementId: string): Promise<void> {
    const element = await this.#programmes.elementParId(elementId);
    if (!element) return;
    const elements = await this.#programmes.elementsDuProgramme(element.programmeId);
    const index = elements.findIndex((e) => e.id === elementId);
    const suivant = elements[index + 1];
    if (!suivant) return;
    const prog = await this.#attributions.progressionParElement(attributionId, suivant.id);
    if (prog && prog.statut === "verrouille") {
      prog.statut = "disponible";
      await this.#attributions.mettreAJourProgression(prog);
    }
  }

  #etat(p: ProgressionElement): EtatRealisation {
    return {
      statut: p.statut,
      tentatives: p.reponsesFausses,
      explicationDisponible: p.reponsesFausses >= SEUIL_EXPLICATION,
    };
  }
}
