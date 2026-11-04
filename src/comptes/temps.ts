// Horloge injectable, pour tester les regles de temps sans attendre.
export interface Horloge {
  maintenant(): number;
}

export const horlogeSysteme: Horloge = {
  maintenant: () => Date.now(),
};

export const SEPT_JOURS = 7 * 24 * 60 * 60 * 1000;

// Jour calendaire a Brazzaville, UTC+1 sans heure d'ete, au format AAAA-MM-JJ.
export function jourBrazzaville(epochMs: number): string {
  return new Date(epochMs + 60 * 60 * 1000).toISOString().slice(0, 10);
}
