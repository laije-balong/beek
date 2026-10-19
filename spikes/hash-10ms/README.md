# Spike A : hachage dans les 10 ms (plan gratuit Cloudflare)

Objectif : trouver le hachage PBKDF2 le plus robuste qui tient dans les 10 ms de calcul par requête du plan gratuit, et mesurer la marge. Teste aussi le temps de calcul disponible dans un Durable Object.

Rappel : les 10 ms sont du temps CPU, pas du temps d'horloge. Le Worker renvoie le temps d'horloge (wallMs). Le temps CPU se lit dans les journaux.

## Ce que vous faites (vous seul déployez)

1. Prérequis : Node 18 ou plus. Installer wrangler : `npm install -g wrangler`.
2. Vous connecter à votre compte : `wrangler login`.
3. Depuis spikes/hash-10ms : `wrangler deploy`. Notez l'URL affichée.
4. Dans un second terminal : `wrangler tail beek-spike-hash`. Laissez-le tourner. Il affiche l'issue de chaque requête et le temps CPU.
5. Lancez le balayage 3 fois de suite, pour avoir des mesures à chaud :
   `curl "https://VOTRE-URL/sweep"`
6. Testez le Durable Object à 100 000 itérations, 3 fois :
   `curl "https://VOTRE-URL/hash-do?iters=100000"`
7. Pour chaque nombre d'itérations, relevez le temps CPU, pas wallMs, et l'issue.
8. Reportez dans le tableau ci-dessous et envoyez-le-moi.
9. Quand c'est fini : `wrangler delete` pour supprimer le Worker.

## Résultats à me renvoyer

| Itérations | Temps CPU Worker (ms) | Temps CPU DO (ms) | Issue (ok / dépassement) | Note |
| --- | --- | --- | --- | --- |
| 10 000 | | | | |
| 50 000 | | | | |
| 100 000 | | | | |
| 150 000 | | | | |
| 200 000 | | | | |
| 300 000 | | | | |
| 600 000 | | | | |

À noter aussi : le nombre d'itérations maximal accepté. Si PBKDF2 est plafonné à 100 000, les lignes au dessus renvoient une erreur. Recopiez le message d'erreur.

## Ce que j'en déduis

Je retiens le plus grand nombre d'itérations dont le temps CPU reste sous 7 à 8 ms à chaud, pour garder une marge sous les 10 ms. Si le plafond est 100 000 et que son temps CPU tient, c'est notre hachage. Point d'honnêteté : ce sera sans doute en deçà des 600 000 itérations recommandées par l'OWASP. C'est le compromis acté, compensé par l'inscription fermée, le blocage après 5 échecs de connexion et les indicateurs de suivi.
