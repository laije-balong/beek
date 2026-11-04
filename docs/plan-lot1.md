# Plan du lot 1 en itérations

Ce document découpe le lot 1 en itérations. Il remplace le chiffrage. Il suit l'ordre proposé par le porteur. Chaque itération est une ou plusieurs demandes de fusion. L'agent vérificateur passe à la fin de chaque itération. Le porteur valide chaque fonction sur l'environnement de test.

Version 0.1 du 22/10/2026. À valider par le porteur.

## Estimation de durée

La durée absolue dépend du rythme de validation du porteur et du débit réel des agents, calibré à la première itération. Les tailles ci-dessous sont relatives : S courte, M moyenne, L longue. Le lot 1 compte 9 itérations, de la 0 à la 8.

## Itérations

### Itération 0 : socle, taille M

Mise en place du dépôt et de la chaîne de test. Projet TypeScript, Workers, routeur Hono, bundle esbuild. Deux liaisons D1, base opérationnelle et base de traces, derrière une couche qui gère le changement de base vers 400 Mo. Liaison Workers KV pour les images. Interface d'authentification vide, à remplir en itération 1. Vitest avec le pool Workers et Playwright. Pipeline GitHub Actions. Copie Markdown des documents dans docs/. Résultat : l'application démarre sur l'environnement de test, vide, et la chaîne de test est verte. Dépendances : aucune.

### Itération 1 : comptes et connexion, taille L

Authentification par hachage partagé, derrière l'interface du socle, selon docs/exigences-techniques/authentification.md. Création d'un compte un par un, écran E-18. Mot de passe temporaire et coupon, écran E-20. Activation, UC-03. Connexion, blocage après 5 échecs RG-06, plafond de réinitialisations RG-29, refus des mots de passe courants côté navigateur RG-08. Codes de secours du formateur EM-ACC-13. Session et déconnexion après 2 heures US-01. Mesure du temps de calcul du serveur pour la connexion complète, médiane et 99e centile, en connexions rapprochées, avec un seuil et une marge sous 10 ms. Si le seuil n'est pas tenu, arrêt et question au porteur. Page de test du hachage du navigateur, à lancer par le porteur sur la machine de référence et sur un téléphone Android. Dépendances : itération 0.

### Itération 2 : contenu et import, taille L

Domaines, filières, niveaux, notions, US-05. Fils rouges, US-06. Format d'import JSON et modèles des types du lot 1 et du défi. Les 12 contrôles d'import du référentiel, section 6. Vérifier sans importer, UC-01. Tester un exercice importé, EM-CON-06. Stockage des images dans Workers KV. Dépendances : itération 0.

### Itération 3 : parcours de l'apprenant et bureautique, taille L

Programme, US-07. Attribution et point de départ, UC-04. Réaliser un exercice, UC-05, avec correction côté serveur des types T01, T02 et T10, les trois types de la bureautique. Indices EM-AID-01, explication après 3 réponses fausses RG-12, statuts de l'annexe B.2. Écran d'exercice E-05, zones Z-01, Z-02 et Z-12. Sécurité : réponses attendues introuvables dans le navigateur, critère 7. Cette itération ouvre la filière bureautique. Dépendances : itérations 1 et 2.

### Itération 4 : reste des types du lot 1, taille M

T03 remise dans l'ordre, T04 association de paires, T05 texte ou code à trous, T07 par comparaison, T09 calcul. Zones Z-03, Z-04, Z-05, Z-07a et Z-11. Dépendances : itération 3.

### Itération 5 : traces, synthèse et budget d'écriture, taille L

Traces EM-TRA-01 à EM-TRA-07, chaque copie, collage et sortie de page enregistré un par un. Données de synthèse, ENF-11. Budget d'écriture par apprenant et par jour, bascule en totaux au delà, signal au formateur. Tests des lignes écrites par action, lecture de meta.rows_written, échec au delà d'un plafond. Tests des lignes lues, base locale de 500 000 traces, vue classe sous 10 000 lignes, US-10 CA4 et critère 15. Volume stocké par action en octets, vérification des 45 Mo par mois. Dépendances : itérations 3 et 4.

### Itération 6 : vues du formateur, alertes et export, taille L

Vue classe US-10, fiche apprenant US-11A, vue exercice US-12, journal des interventions US-11B. Déblocage US-08, passage forcé US-09, désactivation et réactivation US-03, réinitialisation UC-09. Alertes apprenant bloqué, apprenant inactif, commentaire sans réponse, réponse collée suspecte, US-13 à US-16. Export CSV US-17. Dépendances : itération 5.

### Itération 7 : commentaires, signalement, progression et hors classe, taille L

Commentaires EM-AID-04, limites RG-31 à RG-34, masquage US-18, alerte commentaire sans réponse US-15. Signalement et remise à zéro UC-08, alerte exercice signalé. XP et paliers US-20. Groupe hors classe UC-10. Dépendances : itération 6.

### Itération 8 : recette du lot 1 et durcissement, taille M

Tests de bout en bout des 18 critères applicables au lot 1. Revue de sécurité du module des comptes, ENF-06. Performance : 500 000 traces, affichage des vues sous 3 secondes, vue classe sous 10 000 lignes. Rapport final des chiffres. Dépendances : toutes les itérations précédentes.

## Tests et environnements

Les tests unitaires couvrent les règles de gestion. Les tests d'intégration tournent sur D1 en local, par le pool Workers de Vitest. Les tests de bout en bout reprennent les critères de la spécification et les 18 critères du BRD, par Playwright en local. Chaque test porte son identifiant.

Les tests lourds tournent en local, car les quotas de D1 sont comptés par compte Cloudflare et appliqués strictement depuis le 01/09/2026. La base locale reçoit les 500 000 traces. Un petit échantillon distant confirme le comptage sur l'environnement de test. Si le D1 local ne reproduit pas meta.rows_written, la mesure se fait sur l'environnement de test, et le rapport le signale.

Environnement de test séparé de la production. Proposition : un second compte Cloudflare gratuit, après vérification des conditions de Cloudflare, pour ne partager ni les quotas ni les bases du compte de production. Le jeton des tests préalables est remplacé par un jeton de ce compte.

GitHub Actions, plan de consommation sous les 2 000 minutes par mois. Tests rapides, unitaire et intégration, à chaque demande de fusion. Tests de bout en bout à la fusion sur la branche principale, ou une fois par jour si le volume de fusions est élevé.

## Estimation de consommation des agents

L'agent développeur travaille en continu sur une itération. Il lit le fichier d'instructions et les seules sections utiles de docs/. L'agent vérificateur passe une fois par itération. L'estimation fine se calibre à l'itération 0, qui mesure le débit réel. Avant chaque itération, une estimation est écrite, et un relevé est écrit à la fin. Les itérations de taille L comptent pour le double d'une itération de taille S.

L'outil est Claude Code, avec le modèle Opus. L'agent vérificateur est un second agent Claude Code, distinct de l'agent développeur, lancé à la fin de l'itération. Dites-moi votre formule d'abonnement, pour que je cale l'estimation sur vos limites.
