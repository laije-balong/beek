import { AuthHachagePartage } from "./auth/hachage-partage";
import { SignataireSession } from "./auth/session";
import { DepotComptesD1, type BaseD1 } from "./comptes/depot-d1";
import { ServiceComptes } from "./comptes/service";
import { horlogeSysteme } from "./comptes/temps";
import { DepotContenuD1 } from "./contenu/depot-d1";
import type { DepotContenu } from "./contenu/depot";
import { ServiceContenu } from "./contenu/service";
import { DepotExercicesD1 } from "./exercices/depot-d1";
import type { DepotExercices } from "./exercices/depot";
import type { ContexteControle } from "./exercices/controles";
import { ServiceImages } from "./images/service";
import type { StockageKV } from "./images/kv";
import { DepotProgrammesD1 } from "./parcours/depot-d1";
import { ServiceProgrammes } from "./parcours/service";

// Liaisons du Worker. DB est la base D1, POIVRE le secret du hachage,
// SESSION_SECRET le secret de signature des sessions.
export interface Env {
  DB: BaseD1;
  IMAGES: StockageKV;
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

// Assemble le service de la taxonomie du contenu.
export function construireServiceContenu(env: Env): ServiceContenu {
  return new ServiceContenu(new DepotContenuD1(env.DB));
}

// Depot de la taxonomie, pour les lectures hors du service.
export function construireDepotContenu(env: Env): DepotContenu {
  return new DepotContenuD1(env.DB);
}

// Service de stockage des images dans Workers KV.
export function construireServiceImages(env: Env): ServiceImages {
  return new ServiceImages(env.IMAGES);
}

// Service de composition des programmes.
export function construireServiceProgrammes(env: Env): ServiceProgrammes {
  return new ServiceProgrammes(
    new DepotProgrammesD1(env.DB),
    new DepotContenuD1(env.DB),
    new DepotExercicesD1(env.DB)
  );
}

// Assemble le depot des exercices.
export function construireDepotExercices(env: Env): DepotExercices {
  return new DepotExercicesD1(env.DB);
}

// Contexte des controles 3 et 4 : la notion et le fil rouge existent, et
// l'identifiant est libre. Construit a partir des deux depots.
export function contexteControle(
  depotContenu: DepotContenu,
  depotExercices: DepotExercices
): ContexteControle {
  return {
    notionExiste: async (id) => (await depotContenu.notionParId(id)) !== null,
    filRougeExiste: async (id) => (await depotContenu.filRougeParId(id)) !== null,
    identifiantExiste: (id) => depotExercices.existeIdentifiant(id),
  };
}

// Contexte des controles a partir des liaisons du Worker.
export function contexteControleD1(env: Env): ContexteControle {
  return contexteControle(new DepotContenuD1(env.DB), new DepotExercicesD1(env.DB));
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
