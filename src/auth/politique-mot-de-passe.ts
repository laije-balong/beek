// RG-08 : le mot de passe compte au moins 8 caracteres, aucune regle de
// complexite n'est imposee, et les mots de passe les plus courants sont refuses.
// ET-AUTH-16 : ce controle vit dans le navigateur, avant le hachage lent, car le
// serveur ne voit jamais le mot de passe en clair. C'est un garde-fou, pas une
// barriere contre un tiers. Ce module est la source unique de la regle. Il est
// teste ici et sa liste est injectee dans la page pour le controle du navigateur.

export const LONGUEUR_MIN = 8;

// Les mots de passe les plus courants, en minuscules, francais et universels.
// Liste volontairement courte, un garde-fou selon ET-AUTH-16. Elle s'etoffe au
// besoin sans changer la regle.
export const MOTS_DE_PASSE_COURANTS: readonly string[] = [
  "password",
  "motdepasse",
  "12345678",
  "123456789",
  "1234567890",
  "azerty",
  "azertyuiop",
  "qwerty",
  "qwertyuiop",
  "00000000",
  "11111111",
  "aaaaaaaa",
  "password1",
  "motdepasse1",
  "iloveyou",
  "welcome",
  "bienvenue",
  "123soleil",
  "soleil123",
  "chouchou",
  "doudou123",
  "beek2026",
];

const ENSEMBLE_COURANTS = new Set(MOTS_DE_PASSE_COURANTS);

// Renvoie la raison du refus, ou null si le mot de passe est accepte.
export function refusMotDePasse(motDePasse: string): string | null {
  if (motDePasse.length < LONGUEUR_MIN) {
    return "Le mot de passe compte au moins 8 caracteres.";
  }
  if (ENSEMBLE_COURANTS.has(motDePasse.toLowerCase())) {
    return "Ce mot de passe est trop courant. Choisissez-en un autre.";
  }
  return null;
}
