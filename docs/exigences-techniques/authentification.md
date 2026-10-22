# Exigences techniques : authentification

Ce document fixe le stockage et la vérification des mots de passe de Beek sur le plan gratuit de Cloudflare. Il complète le BRD et la spécification fonctionnelle, sans les répéter. Il découle de la mesure du 19/10/2026, qui a montré qu'aucun hachage robuste fait entièrement sur le serveur ne tient dans les 10 ms de calcul par requête.

Version 0.1 du 22/10/2026. Rédigée par le prestataire. À valider par le porteur du projet.

## 1. Décision

Beek utilise un hachage partagé. Le navigateur fait le hachage lent. Le serveur fait un hachage rapide avec une clé secrète, le poivre, tenue hors de la base.

La raison est mesurée. Un PBKDF2 à 100 000 itérations, le maximum que Workers autorise, coûte 17 ms de calcul en production. C'est au dessus de la limite de 10 ms, non ajustable sur le plan gratuit. Un dépassement régulier fait échouer les connexions une à une avec l'erreur 1102. Le navigateur, lui, ne plafonne pas les itérations et reste rapide, y compris sur un téléphone d'entrée de gamme. Déplacer le hachage lent dans le navigateur lève la limite.

Ce choix écarte la connexion par compte Google et le PBKDF2 affaibli à 40 000 itérations. Beek garde sa propre gestion des comptes, à coût nul, avec une résistance au cassage hors ligne au niveau recommandé par l'OWASP.

## 2. Principe du montage

ET-AUTH-01. À la création ou au changement de mot de passe, le navigateur calcule un résultat lent à partir du mot de passe et d'un sel propre au compte. Il envoie ce résultat au serveur par TLS. Le serveur ne reçoit jamais le mot de passe en clair.

ET-AUTH-02. Le serveur applique un hachage rapide à clé, le HMAC, sur le résultat reçu, avec le poivre comme clé. Il stocke cette valeur. Il ne stocke ni le mot de passe, ni le résultat du navigateur.

ET-AUTH-03. À la connexion, le serveur recalcule le HMAC du résultat reçu et le compare à la valeur stockée, à temps constant.

## 3. Paramètres retenus

ET-AUTH-04. Hachage du navigateur : PBKDF2-HMAC-SHA256, 600 000 itérations, sel de 16 octets propre au compte, sortie de 256 bits.

ET-AUTH-05. Hachage du serveur : HMAC-SHA256, clé égale au poivre, sur le résultat du navigateur. Comparaison à temps constant.

Ces valeurs sont mesurées. Le hachage du navigateur prend 0,35 à 0,40 seconde sur l'ordinateur de référence, Windows 10 ou 11 avec 4 Go de mémoire, et 0,35 seconde sur un téléphone Android 10 d'entrée de gamme. Le hachage du serveur coûte 0,33 ms de calcul, pour une limite de 10 ms. Une marge reste ouverte : porter le navigateur à 1 000 000 d'itérations coûte 0,6 seconde, sans effet sur le serveur.

## 4. Le sel

ET-AUTH-06. Chaque compte porte un sel aléatoire de 16 octets, stocké dans la base. Le sel n'est pas secret.

ET-AUTH-07. Le navigateur demande le sel d'une adresse avant la connexion, par un point d'accès dédié.

ET-AUTH-08. Pour une adresse sans compte, le serveur renvoie un sel fictif stable, dérivé du poivre et de l'adresse. Ce sel est indiscernable d'un vrai sel. Le point d'accès répond en temps constant, qu'un compte existe ou non, pour ne pas révéler quelles adresses ont un compte.

## 5. Le poivre

ET-AUTH-09. Le poivre est un secret du Worker, posé par la commande wrangler secret put, jamais inscrit dans la configuration ni dans la base.

ET-AUTH-10. Le poivre est sauvegardé de façon sûre, hors de la base. Le perdre rend toutes les valeurs stockées invérifiables et bloque toutes les connexions.

ET-AUTH-11. Changer le poivre oblige chaque apprenant à refixer son mot de passe, car une valeur stockée ne se recalcule pas sans repasser par le navigateur. Un changement de poivre est donc une opération exceptionnelle, déclenchée seulement en cas de fuite suspectée.

## 6. Ce qui est stocké

ET-AUTH-12. La base contient, par compte, la valeur du HMAC et le sel. Elle ne contient ni le mot de passe en clair, ni une forme réversible, ni le résultat du navigateur. L'exigence EM-ACC-10 est ainsi satisfaite.

ET-AUTH-13. Une fuite de la base seule ne permet ni de se connecter, ni de casser les mots de passe, car le poivre manque. Si le poivre fuit en plus de la base, le cassage redevient possible, mais chaque essai coûte le PBKDF2 complet à 600 000 itérations, au niveau OWASP.

## 7. Distinction des secrets

Un mot de passe choisi par l'apprenant a peu d'entropie. Un secret produit par le serveur en a beaucoup. Les deux ne se traitent pas de la même façon.

ET-AUTH-14. Un mot de passe choisi passe par le hachage lent du navigateur, puis par le hachage rapide du serveur.

ET-AUTH-15. Un secret produit par le serveur, mot de passe temporaire ou code de secours, passe par le seul hachage rapide du serveur. Le serveur le génère, calcule son HMAC avec le poivre et un sel propre, et le stocke. Sa forte entropie suffit face à un hachage rapide. Le serveur n'a donc pas besoin de faire le hachage lent à la génération.

## 8. Flux

### 8.1 Activation (UC-03)

1. L'apprenant saisit son adresse et le mot de passe temporaire reçu sur son coupon.
2. Le mot de passe temporaire part au serveur par TLS. Le serveur recalcule son HMAC et compare. Le compte s'ouvre.
3. L'apprenant choisit son mot de passe. Le navigateur demande le sel du compte, calcule le résultat lent, et l'envoie.
4. Le serveur calcule le HMAC du résultat et le stocke. Les cases des 16 ans et du consentement sont cochées. Le compte passe à actif.

### 8.2 Connexion

1. L'apprenant saisit son adresse. Le navigateur demande le sel du compte.
2. Le navigateur calcule le résultat lent à partir du mot de passe et du sel, et l'envoie.
3. Le serveur recalcule le HMAC et compare à temps constant. En cas d'égalité, la session s'ouvre.

### 8.3 Mot de passe temporaire et réinitialisation (UC-02, UC-09)

1. Le serveur tire un mot de passe temporaire aléatoire à forte entropie.
2. Il stocke son HMAC avec le poivre et un sel propre. Il affiche le mot de passe une seule fois, sur le coupon.
3. L'apprenant s'en sert pour activer son compte ou se reconnecter, selon le flux 8.1. La limite de 5 réinitialisations par compte et par jour, RG-29, s'applique.

### 8.4 Codes de secours du formateur (EM-ACC-13)

1. À la création du compte formateur, le serveur tire plusieurs codes de secours aléatoires à forte entropie.
2. Il stocke le HMAC de chaque code, avec le poivre et un sel propre. Il les affiche une seule fois, pour impression.
3. À l'usage, le formateur saisit un code. Le serveur recalcule son HMAC et compare. Un code utilisé est marqué consommé et ne resert pas.

## 9. Règle portée par le navigateur

ET-AUTH-16. Le refus des mots de passe courants, RG-08, se fait dans le navigateur, avant le hachage lent, car le serveur ne voit jamais le mot de passe en clair. Un apprenant pourrait contourner ce refus avec un client modifié, mais il n'affaiblirait alors que son propre compte. Cette protection est un garde-fou, pas une barrière contre un tiers.

## 10. Défense contre la devinette en ligne

ET-AUTH-17. Le hachage partagé protège le cassage hors ligne, pas la devinette en ligne. Un attaquant peut calculer lui-même le résultat du navigateur et le soumettre, sans subir la lenteur. Le blocage du compte après 5 échecs de connexion, RG-06, et le plafond de réinitialisations, RG-29, bornent ces essais.

## 11. Risques résiduels et compensations

Le premier risque est la devinette en ligne, bornée par RG-06 et RG-29. Le deuxième est la fuite du poivre en plus de la base, qui ramène au coût d'un PBKDF2 à 600 000 itérations par essai. Le troisième est la perte du poivre, qui bloque toutes les connexions, et que la sauvegarde du poivre évite. Le quatrième est le contournement du refus des mots de passe courants, sans effet sur les tiers.

## 12. Correspondance avec les exigences

L'exigence EM-ACC-10 est satisfaite par le point 6. L'exigence EM-ACC-06, la connexion par adresse et mot de passe, suit le flux 8.2. Les règles RG-04, RG-05, RG-08 et RG-09 sont couvertes par les points 7, 8 et 9. Les quatre critères d'acceptation de la user story US-02 passent : aucune valeur en clair ou réversible dans la base, deux mots de passe identiques donnent deux valeurs stockées différentes grâce au sel propre, 100 connexions successives tiennent dans la limite de calcul, et aucun mot de passe n'apparaît dans les journaux.

## 13. Points d'exploitation à acter

Deux points relèvent de l'exploitation, pas du développement. Le poivre est sauvegardé de façon sûre dès la mise en service. Un changement de poivre reste une opération exceptionnelle, qui oblige chaque apprenant à refixer son mot de passe.
