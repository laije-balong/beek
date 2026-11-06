import type { DepotContenu } from "./depot";
import {
  ErreurContenu,
  NOMS_NIVEAUX,
  type Domaine,
  type Filiere,
  type Niveau,
  type Notion,
} from "./types";

// Domaine de la taxonomie du contenu, US-05. Le formateur cree domaines,
// filieres et notions. La creation d'une filiere cree d'office ses trois
// niveaux, qui ne se modifient pas. L'unicite retenue : un nom de domaine unique
// dans Beek, un nom de filiere unique dans son domaine, un nom de notion unique
// dans son niveau.
export class ServiceContenu {
  readonly #depot: DepotContenu;

  constructor(depot: DepotContenu) {
    this.#depot = depot;
  }

  async creerDomaine(nom: string): Promise<Domaine> {
    const propre = nom.trim();
    if (!propre) throw new ErreurContenu("Donnez un nom au domaine.");
    if (await this.#depot.domaineParNom(propre)) {
      throw new ErreurContenu("Un domaine porte deja ce nom.");
    }
    const domaine: Domaine = {
      id: crypto.randomUUID(),
      nom: propre,
      ordre: (await this.#depot.domaines()).length,
    };
    await this.#depot.creerDomaine(domaine);
    return domaine;
  }

  // Cree une filiere dans un domaine, avec ses trois niveaux d'office, dans
  // l'ordre Decouverte, Fondamentaux, Intermediaire (US-05 CA1, PS-12).
  async creerFiliere(
    domaineId: string,
    nom: string
  ): Promise<{ filiere: Filiere; niveaux: Niveau[] }> {
    const propre = nom.trim();
    if (!propre) throw new ErreurContenu("Donnez un nom a la filiere.");
    const domaine = await this.#depot.domaineParId(domaineId);
    if (!domaine) throw new ErreurContenu("domaine introuvable");
    if (await this.#depot.filiereParNomDansDomaine(domaineId, propre)) {
      throw new ErreurContenu("Une filiere porte deja ce nom dans ce domaine.");
    }
    const filiere: Filiere = {
      id: crypto.randomUUID(),
      nom: propre,
      ordre: (await this.#depot.filieresDuDomaine(domaineId)).length,
      domaineId,
    };
    const niveaux: Niveau[] = NOMS_NIVEAUX.map((nomNiveau, i) => ({
      id: crypto.randomUUID(),
      nom: nomNiveau,
      ordre: i,
      filiereId: filiere.id,
    }));
    await this.#depot.creerFiliereAvecNiveaux(filiere, niveaux);
    return { filiere, niveaux };
  }

  async creerNotion(niveauId: string, nom: string): Promise<Notion> {
    const propre = nom.trim();
    if (!propre) throw new ErreurContenu("Donnez un nom a la notion.");
    const niveau = await this.#depot.niveauParId(niveauId);
    if (!niveau) throw new ErreurContenu("niveau introuvable");
    if (await this.#depot.notionParNomDansNiveau(niveauId, propre)) {
      throw new ErreurContenu("Une notion porte deja ce nom a ce niveau.");
    }
    const notion: Notion = {
      id: crypto.randomUUID(),
      nom: propre,
      ordre: (await this.#depot.notionsDuNiveau(niveauId)).length,
      niveauId,
    };
    await this.#depot.creerNotion(notion);
    return notion;
  }

  // Refuse la suppression d'une notion rattachee a au moins un exercice, avec le
  // nombre dans le message (US-05 CA4).
  async supprimerNotion(id: string): Promise<void> {
    const notion = await this.#depot.notionParId(id);
    if (!notion) throw new ErreurContenu("notion introuvable");
    const nombre = await this.#depot.nombreExercicesDeNotion(id);
    if (nombre > 0) {
      throw new ErreurContenu(`Cette notion est utilisée par ${nombre} exercices.`);
    }
    await this.#depot.supprimerNotion(id);
  }

  // Lectures pour l'ecran et les tests.
  domaines(): Promise<Domaine[]> {
    return this.#depot.domaines();
  }
  filieresDuDomaine(domaineId: string): Promise<Filiere[]> {
    return this.#depot.filieresDuDomaine(domaineId);
  }
  niveauxDeFiliere(filiereId: string): Promise<Niveau[]> {
    return this.#depot.niveauxDeFiliere(filiereId);
  }
  notionsDuNiveau(niveauId: string): Promise<Notion[]> {
    return this.#depot.notionsDuNiveau(niveauId);
  }
}
