# Mesure du temps de calcul : à faire maintenant

Marche à suivre concrète pour obtenir la médiane et le 99e centile du temps de calcul du serveur sur la connexion. Le worker déployé est beek, à l'adresse https://beek.cvmosala.workers.dev. Le fond et les seuils sont dans scripts/mesure-connexion.md.

## 1. Poser les secrets distants, si ce n'est pas déjà fait

Le worker a besoin de POIVRE et de SESSION_SECRET pour fonctionner, et de SECRET_AMORCAGE pour créer le premier formateur. Générez trois valeurs aléatoires :
```
openssl rand -base64 48
```
Lancez la commande trois fois. Mettez la première valeur de côté dans un endroit sûr, ce sera POIVRE, qui ne doit plus changer. Posez ensuite les trois secrets, en collant la valeur demandée à chaque fois :
```
wrangler secret put POIVRE
wrangler secret put SESSION_SECRET
wrangler secret put SECRET_AMORCAGE
```

## 2. Vérifier que la base distante est au bon schéma

Le déploiement n'applique pas les migrations. Vérifiez la table et la colonne des codes de secours :
```
wrangler d1 migrations list beek --remote
wrangler d1 execute beek --remote --command "PRAGMA table_info(compte)"
```
Si des migrations sont en attente, ou si la colonne codes_secours manque, appliquez-les :
```
wrangler d1 migrations apply beek --remote
```

## 3. Vérifier qu'aucun formateur n'existe déjà

L'amorçage refuse s'il y a déjà un formateur :
```
wrangler d1 execute beek --remote --command "SELECT email, role FROM compte"
```
Si un formateur apparaît et que ces données sont des essais que vous acceptez de perdre, videz la table. C'est une suppression distante, à votre main :
```
wrangler d1 execute beek --remote --command "DELETE FROM compte"
```

## 4. Créer un compte actif par le navigateur

Ouvrez https://beek.cvmosala.workers.dev/. Dans "Amorcage du premier formateur", saisissez une adresse, par exemple prof@beek.local, le secret d'amorçage, puis "Amorcer le formateur". Notez le mot de passe temporaire affiché. Dans la section Activation, saisissez le mot de passe temporaire, choisissez un nouveau mot de passe, cochez les deux cases, puis Activer. Retenez l'adresse et ce nouveau mot de passe.

## 5. Lancer la rafale de connexions

Depuis le dossier du projet :
```
BASE=https://beek.cvmosala.workers.dev \
EMAIL=prof@beek.local MOTDEPASSE=VotreNouveauMotDePasse \
N=500 CONCURRENCE=25 node scripts/mesure-connexion.mjs
```
Le script vérifie une connexion, envoie les 500, puis affiche une fenêtre UTC, DEBUT et FIN. Copiez ces deux valeurs.

## 6. Attendre, puis lire les chiffres

Patientez 3 à 5 minutes, le temps que l'analytique de Cloudflare se remplisse.

Voie simple, sans jeton : tableau de bord Cloudflare, Workers et Pages, worker beek, onglet Metrics, section CPU Time, plage de temps de la rafale. Lisez la médiane et le 99e centile, en millisecondes.

Voie par script : récupérez l'identifiant du compte avec wrangler whoami, créez un jeton d'API avec le modèle "Read Analytics and Logs", puis :
```
CF_API_TOKEN=votre-jeton CF_ACCOUNT_ID=votre-identifiant \
SCRIPT_NAME=beek \
DEBUT=la-valeur-DEBUT FIN=la-valeur-FIN \
node scripts/cpu-centiles.mjs
```

## 7. Le verdict

Limite dure : 10 ms. Marge visée : 99e centile sous 5 ms. Sous 5 ms, le seuil est tenu avec marge. Entre 5 et 10 ms, tenu mais à signaler. À 10 ms ou au-dessus, arrêt et question.

Envoyez-moi la médiane et le 99e centile. En cas d'erreur d'une commande, collez-la, je corrige.
