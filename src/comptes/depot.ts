import type { Compte } from "./types";

// Interface du depot des comptes. Le domaine ne connait que cette interface.
// Une version en memoire sert aux tests, une version D1 servira en production.
export interface DepotComptes {
  parEmail(email: string): Promise<Compte | null>;
  parId(id: string): Promise<Compte | null>;
  creer(compte: Compte): Promise<void>;
  mettreAJour(compte: Compte): Promise<void>;
}
