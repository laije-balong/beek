# Beek : instructions de la session

Ce fichier est l'unique source d'instructions de travail. Claude le lit au lieu de relire tout le BRD. La charte de rédaction du dossier parent, /home/gnolab/projets/CLAUDE.md, reste en vigueur pour tout document écrit.

## Méthode de travail

Pas d'agents. Claude écrit le code, dans cette session, en Opus. Claude s'auto-teste avec des tests automatisés. Le porteur teste à la main sur l'environnement de test et valide chaque fonction. C'est le fonctionnement habituel, Claude et le porteur, sans agent derrière.

Claude est le seul auteur du code de l'application. Le porteur relit, teste et valide.

Le travail avance par itérations. Chaque itération livre un lot cohérent avec ses tests, et se valide sur l'environnement de test avant la suite.

Claude ne committe pas et ne pousse pas. Claude fournit le contenu de chaque commit, le porteur committe. Une fusion n'a lieu que si les tests sont au vert et la relecture faite.

## Autorité des documents

Les documents de référence sont dans docs/, en Markdown, en lecture seule. Ce sont le BRD v1.4, la spécification fonctionnelle v1.4, le référentiel des types d'exercices v1.1, et les maquettes des lots 1 à 4. En cas d'écart entre le code et ces documents, les documents font foi. Toute modification d'une exigence passe par une proposition écrite que le porteur valide. Une règle absente des documents se demande au porteur, elle ne s'invente pas.

Claude ne lit, dans docs/, que les sections de l'itération en cours. Il ne recharge pas tout le BRD.

## Échelle du projet

Beek vise 5 apprenants actifs, décidé le 22/10/2026. À cette échelle, les règles d'échelle conçues pour 30 apprenants sont allégées, selon docs/propositions/simplification-5-apprenants.md, une fois validée par le porteur.

## Contraintes du projet

Coût nul strict. Aucun service payant, aucun abonnement, aucun moyen de paiement enregistré, pas de R2. Tout tient sur le plan gratuit de Cloudflare et sur GitHub Free.

Périmètre du lot 1. Les types d'exercices T01 à T05, T07 par comparaison, T09 et T10. Toute la plateforme, commentaires compris. Les types T06, T07 par tests et T08 relèvent des lots suivants.

Stockage. Selon la proposition de simplification pour 5 apprenants. Les images d'exercices, 200 Ko au plus, vont dans Workers KV, hors de la base, sans moyen de paiement.

Authentification. Hachage partagé selon docs/exigences-techniques/authentification.md, isolé derrière une interface.

Commentaires. 500 caractères au plus, 3 de suite sans réponse par exercice, 10 par jour et par apprenant. Les contrôles sont faits par le serveur. Règles RG-31 à RG-34.

## Règles de prudence

Aucune boucle sans fin. Après deux échecs sur le même problème, Claude s'arrête et pose la question au porteur.

Aucun secret dans le dépôt. Aucun accès à la production sans l'accord du porteur. Aucune suppression de base ou de données sans son accord.

La mise en production se fait seulement sur accord explicite du porteur, avec un retour possible à la version précédente.

## Vérification des affirmations

Toute affirmation technique s'appuie sur la documentation officielle ou sur un test. Trois affirmations passées se sont révélées fausses après vérification, et servent de rappel : R2 n'est pas gratuit sans moyen de paiement, aucune obligation légale de conserver les traces n'est établie, un hachage dans le navigateur est utile dans le montage à poivre.

## Sécurité, dès le lot 1

Les réponses attendues et les explications non débloquées sont introuvables dans le navigateur, critère 7 et EM-EXE-03.

Le serveur refuse tout envoi qui ne passe pas par la page. Références US-07 CA3, US-19 CA2, critère 18.

Un apprenant n'accède qu'à ses propres données. Le formateur accède aux données de tous les apprenants. Référence ENF-05.

## Pile technique

TypeScript partout. Cloudflare Workers pour le serveur, avec le routeur Hono. D1 pour les données. Workers KV pour les images. Rendu HTML côté serveur, avec des îlots de TypeScript pour les écrans interactifs, bundlés au besoin. Tests par Vitest avec le pool Workers pour l'unitaire et l'intégration sur D1 local, et Playwright pour le bout en bout en local.

## Commandes du projet

npm run dev pour le serveur local. npm test pour l'unitaire et l'intégration. npm run typecheck pour les types. npm run test:e2e pour le bout en bout, ajouté avec les premiers écrans. Le déploiement wrangler deploy reste réservé au porteur.

## Conventions

Langue française pour l'interface, les messages et les documents. La charte du dossier parent s'applique à tout document.

Chaque test porte l'identifiant qu'il vérifie, par exemple UC-05 A13, US-15 CA5 ou critère 18.

Les identifiants de la spécification sont cités dans les messages de commit.

La définition de prêt et la définition de terminé de la spécification, section 3, encadrent chaque tâche.
