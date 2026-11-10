import type { DepotProgrammes } from "./depot";
import type { DepotContenu } from "../contenu/depot";
import type { DepotExercices } from "../exercices/depot";
import type { Exercice } from "../exercices/types";
import { ErreurParcours, type ElementProgramme, type Programme } from "./types";

// Un element ajoutable, tel que l'ecran du formateur l'affiche.
export interface ElementAjoutable {
  identifiant: string;
  titre: string;
  type: string;
}

// Un element du programme avec le titre de son exercice, pour l'affichage.
export interface ElementDetaille {
  id: string;
  position: number;
  exerciceIdentifiant: string;
  titre: string;
  type: string;
}

// Composition d'un programme (US-07). Il assemble un programme a partir des
// exercices d'une filiere, avec au plus un fil rouge.
export class ServiceProgrammes {
  readonly #depot: DepotProgrammes;
  readonly #contenu: DepotContenu;
  readonly #exercices: DepotExercices;

  constructor(depot: DepotProgrammes, contenu: DepotContenu, exercices: DepotExercices) {
    this.#depot = depot;
    this.#contenu = contenu;
    this.#exercices = exercices;
  }

  async creerProgramme(
    nom: string,
    filiereId: string,
    filRougeId: string | null
  ): Promise<Programme> {
    const propre = nom.trim();
    if (!propre) throw new ErreurParcours("Donnez un nom au programme.");
    if (!(await this.#contenu.filiereParId(filiereId))) {
      throw new ErreurParcours("filiere introuvable");
    }
    if (filRougeId !== null && !(await this.#contenu.filRougeParId(filRougeId))) {
      throw new ErreurParcours("fil rouge introuvable");
    }
    const programme: Programme = { id: crypto.randomUUID(), nom: propre, filiereId, filRougeId };
    await this.#depot.creerProgramme(programme);
    return programme;
  }

  // Filiere d'un exercice, deduite de sa notion.
  async #filiereDExercice(exercice: Exercice): Promise<string | null> {
    const notion = await this.#contenu.notionParId(exercice.notionId);
    if (!notion) return null;
    const niveau = await this.#contenu.niveauParId(notion.niveauId);
    return niveau?.filiereId ?? null;
  }

  // Un exercice est ajoutable s'il est de nature "exercice" (CA4), de la filiere
  // du programme (CA2, CA3), et sans fil rouge ou du fil rouge du programme
  // (RG-22).
  async #estAjoutable(exercice: Exercice, programme: Programme): Promise<boolean> {
    if (exercice.nature !== "exercice") return false;
    if ((await this.#filiereDExercice(exercice)) !== programme.filiereId) return false;
    if (exercice.filRougeId !== null && exercice.filRougeId !== programme.filRougeId) return false;
    return true;
  }

  // Liste des exercices ajoutables au programme, filtree (US-07 CA2).
  async elementsAjoutables(programmeId: string): Promise<ElementAjoutable[]> {
    const programme = await this.#depot.programmeParId(programmeId);
    if (!programme) throw new ErreurParcours("programme introuvable");
    const dejaLa = new Set(
      (await this.#depot.elementsDuProgramme(programmeId)).map((e) => e.exerciceIdentifiant)
    );
    const ajoutables: ElementAjoutable[] = [];
    for (const ex of await this.#exercices.tous()) {
      if (dejaLa.has(ex.identifiant)) continue;
      if (await this.#estAjoutable(ex, programme)) {
        ajoutables.push({ identifiant: ex.identifiant, titre: ex.titre, type: ex.contenu.type });
      }
    }
    return ajoutables;
  }

  // Ajoute un exercice en fin de programme. Le serveur refuse un exercice hors
  // filiere ou hors fil rouge, meme envoye directement (US-07 CA3).
  async ajouterElement(
    programmeId: string,
    exerciceIdentifiant: string
  ): Promise<ElementProgramme> {
    const programme = await this.#depot.programmeParId(programmeId);
    if (!programme) throw new ErreurParcours("programme introuvable");
    const exercice = await this.#exercices.parIdentifiant(exerciceIdentifiant);
    if (!exercice) throw new ErreurParcours("exercice introuvable");
    const elements = await this.#depot.elementsDuProgramme(programmeId);
    if (elements.some((e) => e.exerciceIdentifiant === exerciceIdentifiant)) {
      throw new ErreurParcours("exercice deja dans le programme");
    }
    if (!(await this.#estAjoutable(exercice, programme))) {
      throw new ErreurParcours("element hors de la filiere ou du fil rouge du programme");
    }
    const element: ElementProgramme = {
      id: crypto.randomUUID(),
      programmeId,
      position: elements.length,
      exerciceIdentifiant,
    };
    await this.#depot.ajouterElement(element);
    return element;
  }

  async retirerElement(elementId: string): Promise<void> {
    const element = await this.#depot.elementParId(elementId);
    if (!element) throw new ErreurParcours("element introuvable");
    // CA6, le refus si un apprenant a commence l'element, viendra avec la
    // progression de l'apprenant.
    await this.#depot.retirerElement(elementId);
  }

  // Reordonne les elements selon la liste d'identifiants donnee (US-07 CA1).
  async reordonner(programmeId: string, ordreIds: string[]): Promise<void> {
    const elements = await this.#depot.elementsDuProgramme(programmeId);
    const ids = new Set(elements.map((e) => e.id));
    if (ordreIds.length !== elements.length || !ordreIds.every((id) => ids.has(id))) {
      throw new ErreurParcours("ordre invalide");
    }
    await this.#depot.majPositions(ordreIds.map((id, position) => ({ ...elements.find((e) => e.id === id)!, position })));
  }

  programmes(): Promise<Programme[]> {
    return this.#depot.programmes();
  }
  programmeParId(id: string): Promise<Programme | null> {
    return this.#depot.programmeParId(id);
  }

  // Elements du programme avec le titre de leur exercice.
  async elementsDetailles(programmeId: string): Promise<ElementDetaille[]> {
    const elements = await this.#depot.elementsDuProgramme(programmeId);
    const detailles: ElementDetaille[] = [];
    for (const e of elements) {
      const ex = await this.#exercices.parIdentifiant(e.exerciceIdentifiant);
      detailles.push({
        id: e.id,
        position: e.position,
        exerciceIdentifiant: e.exerciceIdentifiant,
        titre: ex?.titre ?? e.exerciceIdentifiant,
        type: ex?.contenu.type ?? "?",
      });
    }
    return detailles;
  }
}
