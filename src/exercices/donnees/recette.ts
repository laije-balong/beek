// Cinq exercices reels des semaines 1 a 3 de la formation, pour la recette du
// lot 1 (demande 3.7). Ils sont ecrits comme des donnees, un par entree, avec les
// champs de la section 3 du referentiel. Un futur import reprendra cette forme.
//
// Les references notionId et filRougeId sont des slugs lisibles, resolus en
// identifiants reels au chargement dans Beek. Le controle 3 verifie alors leur
// existence.
//
// A VALIDER : l'indice generique et l'explication detaillee sont absents des
// fiches papier. Ils sont ici rediges en brouillon a partir des fiches, selon la
// voie choisie par le porteur. A relire et corriger.

import type { Exercice } from "../types";

// Taxonomie a mettre en place pour accueillir les exercices de la recette. Une
// filiere par matiere, au niveau Decouverte, une notion par seance (demande 3.6).
// Le slug relie chaque notion et chaque fil rouge aux references des exercices
// ci-dessous, resolues en identifiants reels au chargement.
export const TAXONOMIE_RECETTE = {
  domaine: "Formation programmation",
  filieres: [
    {
      nom: "Histoire de l'informatique et de la programmation",
      notions: [
        { slug: "hist-s1", niveau: "Découverte", nom: "Compter et calculer avant l'ordinateur" },
      ],
    },
    {
      nom: "Fonctionnement de l'ordinateur",
      notions: [{ slug: "mach-s8", niveau: "Découverte", nom: "Binaire et langages" }],
    },
    {
      nom: "Logique et résolution de problèmes",
      notions: [
        { slug: "logi-s3", niveau: "Découverte", nom: "Un ordinateur exécute des instructions" },
        { slug: "logi-s6", niveau: "Découverte", nom: "Découper un problème" },
        { slug: "logi-s9", niveau: "Découverte", nom: "Vrai, faux et comparaisons" },
      ],
    },
  ],
  filsRouges: [
    {
      slug: "cyber-mwinda",
      nom: "Cyber Mwinda",
      description:
        "Cybercafé fictif de Brazzaville. Impression 50 FCFA la page, internet 500 FCFA l'heure.",
    },
  ],
};

export const EXERCICES_RECETTE: Exercice[] = [
  // Seance 1, exercice 4. Vrai ou faux a cinq phrases, rendu en T05 avec une
  // liste "Vrai / Faux" par phrase.
  {
    identifiant: "HIST-DEC-S01E04",
    nature: "exercice",
    titre: "Vrai ou faux : les premieres machines a calculer",
    notionId: "hist-s1",
    filRougeId: null,
    dureeMinutes: 5,
    enonce: "Pour chaque phrase sur l'histoire du calcul, indiquez si elle est vraie ou fausse.",
    images: [],
    collageAutorise: true,
    indiceGenerique:
      "Reprenez l'ordre de la frise et le role de chaque machine : laquelle calculait, laquelle etait programmable, laquelle etait electronique.",
    explicationDetaillee:
      "L'os d'Ishango, trouve en Afrique centrale, est une trace de comptage tres ancienne, donc la phrase 1 est vraie. La Pascaline ne faisait qu'additionner et soustraire, elle n'etait pas programmable, donc la phrase 2 est fausse. Pascal l'a concue pour aider son pere a calculer les impots, la phrase 3 est vraie. L'arithmometre a ete fabrique en serie et utilise dans les bureaux, la phrase 4 est vraie. Les premieres machines a calculer etaient mecaniques et non electroniques, donc la phrase 5 est fausse.",
    contenu: {
      type: "T05",
      texte:
        "1. L'os d'Ishango a été trouvé en Afrique centrale. [[trou]]\n" +
        "2. La Pascaline pouvait être programmée pour faire des tâches différentes. [[trou]]\n" +
        "3. Pascal a conçu sa machine pour aider son père à calculer les impôts. [[trou]]\n" +
        "4. L'arithmomètre a été fabriqué en série et utilisé dans les bureaux. [[trou]]\n" +
        "5. Les premières machines à calculer étaient électroniques. [[trou]]",
      trous: [
        { reponsesAcceptees: ["Vrai"], mode: "texte", choix: ["Vrai", "Faux"] },
        {
          reponsesAcceptees: ["Faux"],
          mode: "texte",
          choix: ["Vrai", "Faux"],
          indice: "La Pascaline pouvait-elle faire autre chose que des additions et des soustractions ?",
        },
        { reponsesAcceptees: ["Vrai"], mode: "texte", choix: ["Vrai", "Faux"] },
        { reponsesAcceptees: ["Vrai"], mode: "texte", choix: ["Vrai", "Faux"] },
        {
          reponsesAcceptees: ["Faux"],
          mode: "texte",
          choix: ["Vrai", "Faux"],
          indice: "En 1642, l'électricité était-elle utilisée dans les maisons ?",
        },
      ],
    },
  },

  // Seance 3, exercice 3. Remise dans l'ordre, T03.
  {
    identifiant: "LOGI-DEC-S03E03",
    nature: "exercice",
    titre: "Imprimer un CV au Cyber Mwinda",
    notionId: "logi-s3",
    filRougeId: "cyber-mwinda",
    dureeMinutes: 5,
    enonce:
      "Un client du Cyber Mwinda veut imprimer son CV. Remettez les étapes dans l'ordre, de la première à la dernière.",
    images: [],
    collageAutorise: true,
    indiceGenerique:
      "Suivez l'ordre réel des gestes : on ouvre d'abord le document, on récupère la feuille en dernier.",
    explicationDetaillee:
      "On ouvre d'abord le document (B), puis on clique sur Imprimer dans le menu Fichier (A), on choisit le nombre de copies (E), on valide avec le bouton Imprimer de la fenêtre (D), et enfin on récupère la feuille à l'imprimante (C). L'ordre est donc B, A, E, D, C.",
    contenu: {
      type: "T03",
      consigne: "Remettez les étapes dans l'ordre.",
      elements: [
        { id: "a", texte: "Cliquer sur Imprimer dans le menu Fichier" },
        { id: "b", texte: "Ouvrir le document" },
        { id: "c", texte: "Récupérer la feuille à l'imprimante" },
        { id: "d", texte: "Cliquer sur le bouton Imprimer de la fenêtre" },
        {
          id: "e",
          texte: "Choisir le nombre de copies",
          indice:
            "Où se trouve le choix du nombre de copies : avant ou après l'ouverture de la fenêtre d'impression ?",
        },
      ],
      ordresAcceptes: [["b", "a", "e", "d", "c"]],
    },
  },

  // Seance 6, exercice 5. Calcul a trois resultats, rendu en T05 avec lecture
  // numerique de chaque trou (points 3.5 et T09).
  {
    identifiant: "LOGI-DEC-S06E05",
    nature: "exercice",
    titre: "Découper le calcul d'une facture",
    notionId: "logi-s6",
    filRougeId: "cyber-mwinda",
    dureeMinutes: 5,
    enonce:
      "Un client imprime 6 pages et reste 3 heures sur internet. Découpez le problème, puis calculez chaque montant.",
    images: [],
    collageAutorise: true,
    indiceGenerique:
      "Calculez chaque service à part avec son tarif, puis additionnez : impression 50 FCFA la page, internet 500 FCFA l'heure.",
    explicationDetaillee:
      "Les impressions coûtent 6 pages fois 50 FCFA, soit 300 FCFA. L'internet coûte 3 heures fois 500 FCFA, soit 1 500 FCFA. Le total est 300 plus 1 500, soit 1 800 FCFA.",
    contenu: {
      type: "T05",
      texte:
        "Tarifs : impression 50 FCFA la page, internet 500 FCFA l'heure.\n" +
        "Prix des impressions pour 6 pages : [[trou]] FCFA\n" +
        "Prix d'internet pour 3 heures : [[trou]] FCFA\n" +
        "Total à payer : [[trou]] FCFA",
      trous: [
        {
          reponsesAcceptees: ["300"],
          mode: "texte",
          lectureNumerique: { format: "entier" },
          indice: "Multipliez le nombre de pages par 50 FCFA.",
        },
        {
          reponsesAcceptees: ["1500"],
          mode: "texte",
          lectureNumerique: { format: "entier" },
          indice: "Combien d'heures, et combien coûte une heure ?",
        },
        {
          reponsesAcceptees: ["1800"],
          mode: "texte",
          lectureNumerique: { format: "entier" },
          indice: "Additionnez le prix des impressions et le prix d'internet.",
        },
      ],
    },
  },

  // Seance 8, exercice 3. Binaire sur 4 bits, T02 mode exact : le zero de gauche
  // est exige, ce que T09 ne verrait pas.
  {
    identifiant: "MACH-DEC-S08E03",
    nature: "exercice",
    titre: "Écrire 6 en binaire sur 4 bits",
    notionId: "mach-s8",
    filRougeId: null,
    dureeMinutes: 5,
    enonce: "Écrivez le nombre 6 en binaire sur 4 bits.",
    images: [],
    collageAutorise: true,
    indiceGenerique:
      "Posez les quatre positions 8, 4, 2, 1 de gauche à droite et mettez un 1 sous les cartes qui forment le nombre, sans oublier le zéro de gauche.",
    explicationDetaillee:
      "Sur 4 bits, les positions valent 8, 4, 2, 1 de gauche à droite. Le nombre 6 vaut 4 plus 2, donc on met un 1 sous 4 et sous 2, et un 0 sous 8 et sous 1. Cela donne 0110. Le zéro de gauche est exigé car la consigne demande 4 bits.",
    contenu: {
      type: "T02",
      question: "Écrivez le nombre 6 en binaire sur 4 bits.",
      mode: "exact",
      reponsesAcceptees: ["0110"],
      erreursPrevues: [
        {
          valeur: "110",
          indice: "La consigne demande 4 bits. Combien de chiffres avez-vous écrit ?",
        },
        { valeur: "1100", indice: "Quelle position est la plus à droite ?" },
      ],
    },
  },

  // Seance 9, exercice 4. Choix du symbole de comparaison, rendu en T05 a un trou,
  // en mode pseudo-code : la barre de symboles sert a saisir ≥, et ">=" est aussi
  // accepte (points 3.4b et 3.4c).
  {
    identifiant: "LOGI-DEC-S09E04",
    nature: "exercice",
    titre: "La condition de la remise",
    notionId: "logi-s9",
    filRougeId: "cyber-mwinda",
    dureeMinutes: 5,
    enonce:
      "Règle du Cyber Mwinda : le client a droit à une remise s'il imprime 100 pages ou plus. Complétez la condition avec le bon symbole.",
    images: [],
    collageAutorise: true,
    indiceGenerique:
      "Testez la valeur limite : un client qui imprime exactement 100 pages doit avoir la remise, car la règle dit 100 pages ou plus.",
    explicationDetaillee:
      "La règle accorde la remise à partir de 100 pages, donc 100 pages doivent suffire. Le symbole supérieur ou égal, ≥, est vrai pour 100 et au-delà. Le symbole supérieur strict, >, exclurait 100. La condition est donc pages ≥ 100.",
    contenu: {
      type: "T05",
      texte: "pages [[trou]] 100",
      trous: [
        {
          reponsesAcceptees: ["≥"],
          mode: "pseudo-code",
          indice:
            "Avec votre symbole, un client qui imprime exactement 100 pages a-t-il la remise ? La règle dit 100 ou plus.",
        },
      ],
    },
  },
];
