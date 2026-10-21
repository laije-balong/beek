# Spike A : hachage dans les 10 ms (plan gratuit Cloudflare)

Objectif : connaître le temps CPU d'un hachage PBKDF2 sur Workers, pour juger la marge sous les 10 ms par requête.

Constat déjà établi : Workers plafonne PBKDF2 à 100 000 itérations. Au dessus, deriveBits renvoie une erreur. Notre hachage PBKDF2 est donc limité à 100 000 itérations, en deçà des 600 000 recommandées par l'OWASP.

Le temps CPU ne se lit pas dans le script. Le Worker renvoie wallMs à 0, car le runtime fige l'horloge pendant le calcul. Ce n'est pas une erreur. Le temps CPU se lit dans le tableau de bord. wrangler tail ne se connecte pas depuis WSL, donc on passe par le tableau de bord.

## Ce que vous faites (vous seul déployez)

1. Depuis spikes/hash-10ms : `wrangler deploy`. Notez l'URL.
2. Générez du trafic à 100 000 itérations, 50 fois :
   `seq 50 | xargs -I{} curl -s "https://VOTRE-URL/hash?iters=100000" -o /dev/null`
3. Dans le tableau de bord Cloudflare, ouvrez le Worker beek-spike-hash, onglet Observability ou Logs. Les journaux d'invocation affichent le temps CPU de chaque requête.
4. Relevez quelques valeurs de temps CPU, la médiane et la plus haute suffisent, et envoyez-les-moi.
5. Quand c'est fini : `wrangler delete`.

## Ce que j'en déduis

Les appels à 100 000 itérations renvoient ok, donc le hachage reste sous la limite dure qui arrête un Worker. Le temps CPU réel dit la marge. Sous 7 à 8 ms, nous sommes confortables. Proche de 10 ms, nous sommes exposés à des coupures régulières. Vu le plafond de 100 000, je prépare un second spike qui teste bcrypt, scrypt et argon2id en WebAssembly, pour retenir le hachage le plus résistant qui tient dans les 10 ms.
