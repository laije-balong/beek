import { describe, it, expect } from "vitest";
import { controlesCoherence, controler } from "../../src/exercices/controles";
import type { ContexteControle } from "../../src/exercices/controles";
import type { Exercice } from "../../src/exercices/types";

function t01Valide(): Exercice {
  return {
    identifiant: "HIST-DEC-001",
    nature: "exercice",
    titre: "Os d'Ishango",
    notionId: "notion-1",
    filRougeId: null,
    dureeMinutes: 5,
    enonce: "Que trouve-t-on sur l'os d'Ishango ?",
    images: [],
    collageAutorise: true,
    indiceGenerique: "Repensez a l'activite des cailloux.",
    explicationDetaillee: "L'os d'Ishango porte des encoches groupees, trace de comptage.",
    contenu: {
      type: "T01",
      question: "Que trouve-t-on sur l'os d'Ishango ?",
      choixMultiple: false,
      melange: true,
      options: [
        { texte: "des chiffres a l'encre", correcte: false, indice: "L'ecriture existait-elle ?" },
        { texte: "des encoches groupees", correcte: true },
        { texte: "un dessin d'ordinateur", correcte: false },
      ],
    },
  };
}

const ctxTout: ContexteControle = {
  notionExiste: async (id) => id === "notion-1",
  filRougeExiste: async (id) => id === "fr-1",
  identifiantExiste: async () => false,
};

describe("controles du referentiel, section 6", () => {
  it("un exercice T01 correct ne leve aucune erreur", () => {
    expect(controlesCoherence(t01Valide())).toEqual([]);
  });

  it("controle 1 : indice generique ou explication absents", () => {
    const ex = t01Valide();
    ex.indiceGenerique = "";
    ex.explicationDetaillee = "   ";
    const e = controlesCoherence(ex);
    expect(e.some((x) => x.regle.startsWith("controle 1"))).toBe(true);
    expect(e).toHaveLength(2);
  });

  it("controle 2 : nature inconnue", () => {
    const ex = t01Valide();
    // @ts-expect-error valeur volontairement invalide
    ex.nature = "autre";
    expect(controlesCoherence(ex).some((x) => x.regle === "controle 2")).toBe(true);
  });

  it("controle 5 T01 : aucune option correcte, ou choix unique a plusieurs correctes", () => {
    const sansCorrecte = t01Valide();
    if (sansCorrecte.contenu.type === "T01")
      sansCorrecte.contenu.options.forEach((o) => (o.correcte = false));
    expect(controlesCoherence(sansCorrecte).some((x) => x.regle.startsWith("controle 5"))).toBe(true);

    const deuxCorrectes = t01Valide();
    if (deuxCorrectes.contenu.type === "T01") deuxCorrectes.contenu.options[0].correcte = true;
    expect(controlesCoherence(deuxCorrectes).some((x) => x.information.includes("choix unique"))).toBe(
      true
    );
  });

  it("controle 6 T01 : un indice rattache a une option correcte", () => {
    const ex = t01Valide();
    if (ex.contenu.type === "T01") ex.contenu.options[1].indice = "un indice";
    expect(controlesCoherence(ex).some((x) => x.regle.startsWith("controle 6"))).toBe(true);
  });

  it("controle 7 T01 : nombre d'options hors de 2 a 6", () => {
    const ex = t01Valide();
    if (ex.contenu.type === "T01") ex.contenu.options = [{ texte: "seule", correcte: true }];
    expect(controlesCoherence(ex).some((x) => x.regle.startsWith("controle 7"))).toBe(true);
  });

  it("controle 5 T03 : un ordre accepte qui ne contient pas tous les elements", () => {
    const ex: Exercice = {
      ...t01Valide(),
      identifiant: "HIST-DEC-002",
      contenu: {
        type: "T03",
        consigne: "Remettez dans l'ordre",
        elements: [
          { id: "a", texte: "Ishango" },
          { id: "b", texte: "Napier" },
          { id: "c", texte: "Pascal" },
        ],
        ordresAcceptes: [["a", "b"]],
      },
    };
    expect(controlesCoherence(ex).some((x) => x.regle.startsWith("controle 5"))).toBe(true);
  });

  it("controle 5 T04 : une paire qui cite un element absent", () => {
    const ex: Exercice = {
      ...t01Valide(),
      identifiant: "HIST-DEC-003",
      contenu: {
        type: "T04",
        consigne: "Reliez",
        gauche: [{ id: "g1", texte: "Pascal" }],
        droite: [{ id: "d1", texte: "Pascaline" }],
        paires: [{ gaucheId: "g1", droiteId: "inconnu" }],
        indicesGauche: {},
      },
    };
    expect(controlesCoherence(ex).some((x) => x.information.includes("element absent"))).toBe(true);
  });

  it("controle 5 T05 : nombre de trous et reponse de liste hors des choix", () => {
    const ex: Exercice = {
      ...t01Valide(),
      identifiant: "MACH-DEC-006",
      contenu: {
        type: "T05",
        texte: "Le [[trou]] execute les instructions.",
        trous: [
          { reponsesAcceptees: ["processeur"], mode: "texte", choix: ["memoire", "stockage"] },
          { reponsesAcceptees: ["memoire"], mode: "texte" },
        ],
      },
    };
    const e = controlesCoherence(ex);
    // Deux trous decrits mais une seule marque dans le texte.
    expect(e.some((x) => x.information.includes("nombre de trous"))).toBe(true);
    // La reponse "processeur" n'est pas dans les choix proposes.
    expect(e.some((x) => x.information.includes("liste deroulante"))).toBe(true);
  });

  it("controle 6 T02 : une erreur prevue en fait acceptee", () => {
    const ex: Exercice = {
      ...t01Valide(),
      identifiant: "HIST-DEC-005",
      contenu: {
        type: "T02",
        question: "Que signifie calculus ?",
        mode: "texte",
        reponsesAcceptees: ["caillou", "petit caillou"],
        erreursPrevues: [{ valeur: "Caillou", indice: "indice en trop" }],
      },
    };
    expect(controlesCoherence(ex).some((x) => x.regle.startsWith("controle 6"))).toBe(true);
  });

  it("controle 9 : image trop lourde ou format non accepte", () => {
    const ex = t01Valide();
    ex.images = [
      { cle: "k1", octets: 300 * 1024, format: "png", texteAlternatif: "x" },
      // @ts-expect-error format volontairement invalide
      { cle: "k2", octets: 1000, format: "gif", texteAlternatif: "y" },
    ];
    const e = controlesCoherence(ex);
    expect(e.some((x) => x.information.includes("200 Ko"))).toBe(true);
    expect(e.some((x) => x.information.includes("format"))).toBe(true);
  });

  it("controle 3 : notion ou fil rouge inexistant", async () => {
    const ex = t01Valide();
    ex.notionId = "notion-absente";
    ex.filRougeId = "fr-absent";
    const e = await controler(ex, ctxTout);
    expect(e.filter((x) => x.regle.startsWith("controle 3"))).toHaveLength(2);
  });

  it("controle 4 : identifiant deja utilise", async () => {
    const ex = t01Valide();
    const ctx: ContexteControle = { ...ctxTout, identifiantExiste: async () => true };
    const e = await controler(ex, ctx);
    expect(e.some((x) => x.regle.startsWith("controle 4"))).toBe(true);
  });

  it("un exercice valide passe tous les controles", async () => {
    expect(await controler(t01Valide(), ctxTout)).toEqual([]);
  });
});
