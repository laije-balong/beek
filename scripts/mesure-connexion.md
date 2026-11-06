# Mesure du temps de calcul du serveur sur la connexion

Cette procédure mesure le temps de calcul du serveur sur une connexion complète, médiane et 99e centile, en connexions rapprochées. Elle clôt le dernier point de l'itération 1. Le seuil est la limite de 10 ms de calcul par requête du plan gratuit de Cloudflare.

## Ce qui est mesuré, et ce qui ne l'est pas

Le temps de calcul du serveur est le seul chiffre qui compte face à la limite de 10 ms. Les lectures et écritures D1 sont des entrées-sorties et ne comptent pas dans ce budget. Le travail de calcul de la connexion est un HMAC-SHA256 et un peu de JSON et d'hexadécimal.

La latence côté client affichée par le script de rafale inclut le réseau. Elle sert de repère, pas de mesure du calcul serveur. Le temps de calcul se lit par l'analytique de Cloudflare.

## Prérequis

Le worker beek est déployé sur l'environnement de test. Un compte est actif, avec une adresse et un mot de passe connus. Un jeton d'API Cloudflare avec le droit de lecture de l'analytique du compte. L'identifiant du compte Cloudflare.

Pour le jeton : tableau de bord Cloudflare, Mon profil, Jetons d'API, Créer un jeton, modèle "Read Analytics and Logs", ou un jeton sur mesure avec la permission Account Analytics en lecture. Pour l'identifiant du compte : tableau de bord, ou la commande wrangler whoami.

## Étapes

1. Préparez un compte actif. Amorcez le formateur, activez-le, ou prenez un apprenant déjà actif. Notez son adresse et son mot de passe.

2. Lancez la rafale de connexions :

```
BASE=https://beek.VOTRE-SOUS-DOMAINE.workers.dev \
EMAIL=prof@beek.local MOTDEPASSE=VotreMotDePasse \
N=500 CONCURRENCE=25 node scripts/mesure-connexion.mjs
```

Le script vérifie d'abord une connexion. Si elle échoue, il s'arrête sans rien envoyer, pour ne pas bloquer le compte après 5 échecs. En cas de succès, il envoie 500 connexions et affiche la latence client, puis une fenêtre de temps en UTC, DEBUT et FIN.

3. Attendez 3 à 5 minutes. L'analytique de Cloudflare arrive avec un délai et repose sur un échantillon.

4. Lisez le temps de calcul, médiane et 99e centile, sur cette fenêtre :

```
CF_API_TOKEN=votre-jeton CF_ACCOUNT_ID=votre-identifiant \
SCRIPT_NAME=beek \
DEBUT=la-valeur-affichee FIN=la-valeur-affichee \
node scripts/cpu-centiles.mjs
```

Le script convertit les microsecondes en millisecondes et rend un verdict.

## Seuil et règle d'arrêt

Limite dure du plan gratuit : 10 ms de calcul par requête. Marge visée : 99e centile sous 5 ms, soit la moitié du budget.

Si le 99e centile atteint ou dépasse 10 ms : arrêt et question au porteur, selon la règle de prudence. Si le 99e centile reste sous 10 ms mais dépasse 5 ms : résultat tenu, à signaler avant la suite. Sous 5 ms : seuil tenu avec marge.

## Alternative sans jeton, par le tableau de bord

Sans jeton d'API, lisez les chiffres sur le tableau de bord. Workers et Pages, le worker beek, onglet Metrics, section CPU Time. Choisissez la plage de temps de la rafale. Le tableau de bord affiche les centiles de temps de calcul, en millisecondes. Comparez le 99e centile à la limite de 10 ms et à la marge de 5 ms.

## Limites assumées

L'analytique repose sur un échantillon adaptatif, pas sur un relevé exhaustif. Les chiffres sont des estimations, suffisantes pour vérifier une marge large sous 10 ms. La rafale produit autant d'écritures D1 que de connexions, 500 par défaut, comptées dans le quota d'écriture. C'est une mesure ponctuelle, négligeable à l'échelle du projet.
