import { AuthHachagePartage } from "./auth/hachage-partage";
import { DepotComptesD1, type BaseD1 } from "./comptes/depot-d1";
import { ServiceComptes } from "./comptes/service";
import { horlogeSysteme } from "./comptes/temps";

// Liaisons du Worker. DB est la base D1, POIVRE est le secret du serveur.
export interface Env {
  DB: BaseD1;
  POIVRE: string;
}

// Assemble le service des comptes a partir des liaisons du Worker.
export function construireServiceComptes(env: Env): ServiceComptes {
  return new ServiceComptes(
    new DepotComptesD1(env.DB),
    new AuthHachagePartage(env.POIVRE),
    horlogeSysteme
  );
}
