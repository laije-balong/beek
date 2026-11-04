# Proposition : simplification pour 5 apprenants

Le projet vise 5 apprenants actifs, décidé le 22/10/2026, et non plus 30. Cette proposition allège les règles d'échelle en conséquence. Elle modifie des exigences, donc elle demande la validation du porteur avant d'être appliquée. Statut : à valider.

## Pourquoi

À 5 apprenants, Beek écrit environ 750 lignes par jour, pour un quota de 100 000. Une base de 500 Mo reçoit les traces pendant des années. Les mécanismes conçus pour tenir 30 apprenants et des années de traces ne servent plus.

## Ce que je propose de retirer ou d'alléger

1. Une seule base D1, au lieu d'une base opérationnelle et d'une série de bases de traces. Plus de changement de base vers 400 Mo. Modifie ENF-02.
2. Pas de budget d'écriture ni de bascule en totaux. Chaque copie, chaque collage et chaque sortie de page reste enregistré un par un, sans plafond, car le volume est loin du quota. Modifie ENF-13 et retire le critère 19 proposé.
3. Pas de compteurs de synthèse séparés. Le tableau de bord lit directement les traces et la progression, car les tables restent petites. Modifie ENF-11.
4. Pas de test de performance sur 500 000 traces. Le critère 15 vise une échelle réelle, par exemple 50 000 traces, soit plus d'un an d'usage à 5 apprenants.

## Ce que je garde

Le contenu collé reste conservé, jusqu'à 5 000 caractères par collage. Le traçage un par un reste la règle. Les images restent dans Workers KV. Tout le reste du périmètre du lot 1 ne change pas.

## Effet

Le build perd ses parties les plus lourdes et les plus fragiles. Le code reste simple et juste à l'échelle réelle. Si Beek dépasse un jour cette échelle, ces mécanismes se réintroduisent, et le modèle de données le permet déjà.
