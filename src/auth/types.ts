// Interface d'authentification. Le reste du code ne connait que cette interface,
// pour qu'un changement de methode d'authentification ne touche pas les appelants.
// Aujourd'hui le hachage partage. Demain, au besoin, un autre montage.
export interface Authentificateur {
  // Prepare la valeur a stocker pour un mot de passe choisi, a partir du
  // resultat du hachage lent du navigateur.
  preparerVerificateur(resultatNavigateur: Uint8Array): Promise<Uint8Array>;

  // Verifie un resultat de navigateur contre un verificateur stocke.
  verifier(resultatNavigateur: Uint8Array, verificateurStocke: Uint8Array): Promise<boolean>;

  // Prepare la valeur a stocker pour un secret produit par le serveur, mot de
  // passe temporaire ou code de secours, avec son sel. Pas de hachage lent, car
  // ces secrets ont une forte entropie.
  preparerVerificateurSecret(secret: string, sel: Uint8Array): Promise<Uint8Array>;

  // Verifie un secret produit par le serveur contre un verificateur stocke.
  verifierSecret(secret: string, sel: Uint8Array, verificateurStocke: Uint8Array): Promise<boolean>;

  // Sel a renvoyer pour une adresse. Le sel reel si le compte existe, un sel
  // fictif stable sinon, pour ne pas reveler quelles adresses ont un compte.
  selPourAdresse(email: string, selConnu: Uint8Array | null): Promise<Uint8Array>;
}
