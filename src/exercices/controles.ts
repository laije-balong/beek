// Controles de coherence du referentiel, section 6. En l'absence d'import, ils
// s'appliquent en tests automatiques sur les exercices codes comme donnees
// (demande 3.1c). Chaque erreur cite l'identifiant de l'exercice, l'information
// en cause et la regle non respectee (section 6, dernier point).

import {
  correspondUne,
  comparerNombre,
  comparerCode,
} from "./comparaison";
import {
  type Exercice,
  type ContenuExercice,
  TAILLE_IMAGE_MAX,
  T01_OPTIONS_MIN,
  T01_OPTIONS_MAX,
  T03_ELEMENTS_MIN,
  T03_ELEMENTS_MAX,
  MARQUE_TROU,
} from "./types";

export interface ErreurControle {
  identifiant: string;
  information: string;
  regle: string;
}

export function messageErreur(e: ErreurControle): string {
  return `${e.identifiant} : ${e.information} (${e.regle})`;
}

// Contexte pour les controles qui consultent l'etat de Beek, controles 3 et 4.
export interface ContexteControle {
  notionExiste(id: string): Promise<boolean>;
  filRougeExiste(id: string): Promise<boolean>;
  identifiantExiste(identifiant: string): Promise<boolean>;
}

const NATURES = ["exercice", "etape-de-defi"];
const TYPES = ["T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08", "T09", "T10"];
const FORMATS_IMAGE = ["webp", "png", "svg"];

function vide(s: string): boolean {
  return !s || s.trim() === "";
}

function compterOccurrences(texte: string, marque: string): number {
  return texte.split(marque).length - 1;
}

// Controles de coherence, sans consultation de l'etat de Beek : controles 1, 2,
// 5, 6, 7 et 9 de la section 6.
export function controlesCoherence(ex: Exercice): ErreurControle[] {
  const erreurs: ErreurControle[] = [];
  const ajouter = (information: string, regle: string) =>
    erreurs.push({ identifiant: ex.identifiant, information, regle });

  // Controle 1 : une information obligatoire de la section 3 est absente.
  if (vide(ex.identifiant)) ajouter("identifiant absent", "controle 1, champ obligatoire");
  if (vide(ex.titre)) ajouter("titre absent", "controle 1, champ obligatoire");
  if (vide(ex.notionId)) ajouter("notion absente", "controle 1, champ obligatoire");
  if (!(ex.dureeMinutes > 0)) ajouter("duree absente ou nulle", "controle 1, champ obligatoire");
  if (vide(ex.enonce)) ajouter("enonce absent", "controle 1, champ obligatoire");
  if (vide(ex.indiceGenerique))
    ajouter("indice generique absent", "controle 1, champ obligatoire");
  if (vide(ex.explicationDetaillee))
    ajouter("explication detaillee absente", "controle 1, champ obligatoire");

  // Controle 2 : le type ou la nature est inconnu.
  if (!NATURES.includes(ex.nature)) ajouter(`nature inconnue : ${ex.nature}`, "controle 2");
  if (!TYPES.includes(ex.contenu.type)) ajouter(`type inconnu : ${ex.contenu.type}`, "controle 2");

  // Controle 9 : image trop lourde ou format non accepte.
  for (const img of ex.images) {
    if (img.octets > TAILLE_IMAGE_MAX)
      ajouter(`image ${img.cle} au-dela de 200 Ko`, "controle 9, taille d'image");
    if (!FORMATS_IMAGE.includes(img.format))
      ajouter(`image ${img.cle} au format ${img.format}`, "controle 9, format d'image");
  }

  // Controles 5, 6 et 7, propres au type.
  controlesDuType(ex.contenu, ajouter);

  return erreurs;
}

function controlesDuType(
  contenu: ContenuExercice,
  ajouter: (information: string, regle: string) => void
): void {
  switch (contenu.type) {
    case "T01": {
      if (contenu.options.length < T01_OPTIONS_MIN || contenu.options.length > T01_OPTIONS_MAX)
        ajouter("nombre d'options hors de 2 a 6", "controle 7, PR-06");
      const correctes = contenu.options.filter((o) => o.correcte);
      if (correctes.length === 0)
        ajouter("QCM sans option correcte", "controle 5, reponse attendue");
      if (!contenu.choixMultiple && correctes.length > 1)
        ajouter("choix unique avec plusieurs options correctes", "controle 5, reponse attendue");
      for (const o of contenu.options)
        if (o.correcte && o.indice)
          ajouter("indice rattache a une option correcte", "controle 6, indice sur une reponse acceptee");
      break;
    }
    case "T02": {
      if (contenu.reponsesAcceptees.filter((r) => !vide(r)).length === 0)
        ajouter("aucune reponse acceptee", "controle 5, reponse attendue");
      for (const e of contenu.erreursPrevues) {
        const accepte =
          correspondUne(e.valeur, contenu.reponsesAcceptees, contenu.mode) ||
          (contenu.lectureNumerique !== undefined &&
            contenu.reponsesAcceptees.some((r) =>
              comparerNombre(e.valeur, r, contenu.lectureNumerique!.format, contenu.lectureNumerique!.ecartAdmis)
            ));
        if (accepte)
          ajouter(`erreur prevue "${e.valeur}" en fait acceptee`, "controle 6, indice sur une reponse acceptee");
      }
      break;
    }
    case "T03": {
      if (contenu.elements.length < T03_ELEMENTS_MIN || contenu.elements.length > T03_ELEMENTS_MAX)
        ajouter("nombre d'elements hors de 3 a 10", "controle 7, PR-06");
      if (contenu.ordresAcceptes.length === 0)
        ajouter("aucun ordre accepte", "controle 5, reponse attendue");
      const ids = contenu.elements.map((e) => e.id).sort();
      for (const ordre of contenu.ordresAcceptes) {
        const tri = ordre.slice().sort();
        if (tri.length !== ids.length || tri.some((v, i) => v !== ids[i]))
          ajouter("ordre accepte qui ne contient pas tous les elements", "controle 5, reponse attendue");
      }
      break;
    }
    case "T04": {
      const idsGauche = new Set(contenu.gauche.map((g) => g.id));
      const idsDroite = new Set(contenu.droite.map((d) => d.id));
      if (contenu.paires.length === 0)
        ajouter("aucune paire attendue", "controle 5, reponse attendue");
      for (const p of contenu.paires) {
        if (!idsGauche.has(p.gaucheId) || !idsDroite.has(p.droiteId))
          ajouter("paire qui cite un element absent", "controle 5, reponse attendue");
      }
      for (const g of contenu.gauche)
        if (!contenu.paires.some((p) => p.gaucheId === g.id))
          ajouter(`element de gauche ${g.id} sans paire`, "controle 5, reponse attendue");
      break;
    }
    case "T05": {
      if (contenu.trous.length === 0)
        ajouter("aucun trou", "controle 5, reponse attendue");
      if (compterOccurrences(contenu.texte, MARQUE_TROU) !== contenu.trous.length)
        ajouter("le nombre de trous du texte ne correspond pas", "controle 5, reponse attendue");
      for (const [i, trou] of contenu.trous.entries()) {
        if (trou.reponsesAcceptees.filter((r) => !vide(r)).length === 0)
          ajouter(`trou ${i + 1} sans reponse acceptee`, "controle 5, reponse attendue");
        if (trou.choix) {
          for (const r of trou.reponsesAcceptees)
            if (!trou.choix.some((c) => c === r))
              ajouter(`trou ${i + 1}, reponse de liste deroulante absente des choix`, "controle 5, reponse attendue");
        }
      }
      break;
    }
    case "T07": {
      if (contenu.versionsAcceptees.filter((v) => !vide(v)).length === 0)
        ajouter("aucune version corrigee acceptee", "controle 5, reponse attendue");
      for (const e of contenu.erreursPrevues)
        if (correspondUne(e.valeur, contenu.versionsAcceptees, contenu.mode))
          ajouter(`correction prevue "${e.valeur}" en fait acceptee`, "controle 6, indice sur une reponse acceptee");
      break;
    }
    case "T09": {
      if (vide(contenu.valeurAttendue))
        ajouter("valeur attendue absente", "controle 5, reponse attendue");
      for (const e of contenu.erreursPrevues)
        if (comparerNombre(e.valeur, contenu.valeurAttendue, contenu.format, contenu.ecartAdmis))
          ajouter(`erreur prevue "${e.valeur}" en fait acceptee`, "controle 6, indice sur une reponse acceptee");
      break;
    }
    case "T10": {
      if (contenu.codesAcceptes.filter((c) => !vide(c)).length === 0)
        ajouter("aucun code accepte", "controle 5, reponse attendue");
      for (const e of contenu.erreursPrevues)
        if (contenu.codesAcceptes.some((c) => comparerCode(e.valeur, c)))
          ajouter(`code prevu "${e.valeur}" en fait accepte`, "controle 6, indice sur une reponse acceptee");
      break;
    }
  }
}

// Tous les controles, y compris ceux qui consultent l'etat de Beek, controles 3
// et 4 : la notion et le fil rouge existent, l'identifiant est libre.
export async function controler(ex: Exercice, ctx: ContexteControle): Promise<ErreurControle[]> {
  const erreurs = controlesCoherence(ex);
  const ajouter = (information: string, regle: string) =>
    erreurs.push({ identifiant: ex.identifiant, information, regle });

  if (!vide(ex.notionId) && !(await ctx.notionExiste(ex.notionId)))
    ajouter("la notion n'existe pas dans Beek", "controle 3, reference inconnue");
  if (ex.filRougeId !== null && !(await ctx.filRougeExiste(ex.filRougeId)))
    ajouter("le fil rouge n'existe pas dans Beek", "controle 3, reference inconnue");
  if (!vide(ex.identifiant) && (await ctx.identifiantExiste(ex.identifiant)))
    ajouter("identifiant deja utilise", "controle 4, identifiant en double");

  return erreurs;
}
