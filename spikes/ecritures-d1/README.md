# Spike B : comptabilité des écritures D1

Objectif : mesurer, par type d'action d'un apprenant, les lignes écrites index compris et les octets stockés, puis le total d'une journée type. Ces chiffres fixent le budget d'écriture et vérifient l'estimation de 45 Mo de traces par mois.

Le Worker crée une base D1 avec les tables centrales et leurs index, d'après l'annexe D. Il lit les lignes écrites et la taille de la base dans les métadonnées que D1 renvoie à chaque requête.

## Ce que vous faites (vous seul déployez)

1. Créez la base D1 :
   `wrangler d1 create beek-spike-ecritures`
2. Copiez l'identifiant renvoyé dans database_id, dans wrangler.toml.
3. Déployez depuis spikes/ecritures-d1 :
   `wrangler deploy`
4. Créez le schéma et les données de départ :
   `curl -s "https://VOTRE-URL/reset"`
5. Mesurez chaque action, moyenne sur 100 :
   `curl -s "https://VOTRE-URL/submit"`
   `curl -s "https://VOTRE-URL/copy"`
   `curl -s "https://VOTRE-URL/paste"`
   `curl -s "https://VOTRE-URL/exit"`
   `curl -s "https://VOTRE-URL/comment"`
6. Mesurez une journée type :
   `curl -s "https://VOTRE-URL/day"`
7. Envoyez-moi toutes les réponses JSON.

## Nettoyage

`wrangler delete` pour le Worker, puis `wrangler d1 delete beek-spike-ecritures` pour la base.

## Lecture des résultats

Chaque action renvoie les lignes écrites par action, index compris, et les octets par action. La route /day renvoie les lignes et les octets d'une journée chargée, avec les collages à leur taille maximale de 5000 caractères, ce qui donne une borne haute. Elle en déduit les octets par mois pour une classe de 30 apprenants sur 20 jours, à comparer aux 45 Mo estimés, et les lignes écrites par jour pour la classe, à comparer au quota de 100 000.

Si un champ octets revient à null, dites-le-moi. Cela voudra dire que la taille n'est pas exposée dans les métadonnées, et je passerai à une autre mesure.
