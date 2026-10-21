# Spike A2 : hachage partagé, navigateur et serveur

Objectif : vérifier que le hachage partagé règle le problème des 10 ms. Le navigateur fait le hachage lent. Le serveur ne fait qu'un hachage rapide avec un poivre, donc son temps CPU reste petit, même en connexions rapprochées.

## Déployer

1. Placez-vous dans le dossier du spike :
   `cd ~/projets/beek/spikes/hash-partage`
2. `wrangler deploy`. Notez l'URL affichée.

## Mesure 1 : temps CPU du serveur en connexions régulières

Envoyez 500 requêtes, 10 en parallèle, pour simuler des connexions rapprochées :
`seq 500 | xargs -P 10 -I{} curl -s "https://VOTRE-URL/verify-bench" -o /dev/null`

Ouvrez ensuite l'onglet Metrics du Worker beek-spike-hash-partage. Relevez le temps CPU médian et le nombre d'erreurs. On attend un temps CPU bien sous 10 ms et zéro erreur 1102.

## Mesure 2 : temps du hachage lent sur vos appareils

Ouvrez l'URL du Worker dans un navigateur, sur deux appareils. D'abord l'ordinateur de référence, Windows 10 ou 11, 4 Go de mémoire, navigateur récent. Ensuite un téléphone Android d'entrée de gamme. Cliquez sur Mesurer. Notez la durée de chaque nombre d'itérations, sur chaque appareil, et envoyez-moi les deux tableaux.

## Ce que j'en déduis

La mesure 1 doit confirmer que le serveur reste très loin des 10 ms, car il ne fait qu'un HMAC. La mesure 2 fixe le nombre d'itérations du hachage lent. Je propose 600 000, la valeur OWASP. Si un téléphone Android d'entrée de gamme dépasse 1,5 à 2 secondes, nous descendrons à 300 000, en l'assumant. Votre relevé tranche.

## Nettoyage

`wrangler delete` quand les deux mesures sont faites.
