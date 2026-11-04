import { AuthHachagePartage } from "./auth/hachage-partage";
import { SignataireSession } from "./auth/session";
import { DepotComptesD1, type BaseD1 } from "./comptes/depot-d1";
import { ServiceComptes } from "./comptes/service";
import { horlogeSysteme } from "./comptes/temps";

// Liaisons du Worker. DB est la base D1, POIVRE le secret du hachage,
// SESSION_SECRET le secret de signature des sessions.
export interface Env {
  DB: BaseD1;
  POIVRE: string;
  SESSION_SECRET: string;
}

// Assemble le service des comptes a partir des liaisons du Worker.
export function construireServiceComptes(env: Env): ServiceComptes {
  if (!env.POIVRE) {
    throw new Error(
      "POIVRE manquant. En local, definissez-le dans .dev.vars. En production, par wrangler secret put POIVRE."
    );
  }
  return new ServiceComptes(
    new DepotComptesD1(env.DB),
    new AuthHachagePartage(env.POIVRE),
    horlogeSysteme
  );
}

// Assemble le signataire de session.
export function construireSignataireSession(env: Env): SignataireSession {
  if (!env.SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET manquant. En local, definissez-le dans .dev.vars. En production, par wrangler secret put SESSION_SECRET."
    );
  }
  return new SignataireSession(env.SESSION_SECRET);
}
