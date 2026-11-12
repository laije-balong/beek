import { describe, it, expect } from "vitest";
import { ServiceCommentaires } from "../../src/commentaires/service";
import { DepotCommentairesMemoire } from "../../src/commentaires/depot-memoire";
import { ErreurCommentaire } from "../../src/commentaires/types";
import type { Horloge } from "../../src/comptes/temps";

// Horloge pilotee, pour franchir les jours et tester le compteur quotidien.
function horlogePilotee(depart: number): Horloge & { fixer(ms: number): void } {
  let t = depart;
  return { maintenant: () => t, fixer: (ms: number) => { t = ms; } };
}

// 10 janvier 2026, 10 h a Brazzaville (UTC+1).
const JOUR1 = Date.parse("2026-01-10T10:00:00+01:00");
const JOUR2 = Date.parse("2026-01-11T10:00:00+01:00");

function monter(depart = JOUR1) {
  const h = horlogePilotee(depart);
  const service = new ServiceCommentaires(new DepotCommentairesMemoire(), h);
  return { service, h };
}

describe("commentaires sous un exercice (UC-05, RG-31 a RG-33)", () => {
  it("un apprenant ecrit un commentaire, le formateur repond, le fil est ordonne", async () => {
    const { service } = monter();
    await service.publierApprenant("awa", "PY-FON-012", "Je ne comprends pas la boucle.");
    await service.publierFormateur("awa", "PY-FON-012", "Regarde le pas de la boucle.");
    const fil = await service.fil("awa", "PY-FON-012");
    expect(fil.map((c) => c.auteur)).toEqual(["apprenant", "formateur"]);
    expect(fil[0].texte).toBe("Je ne comprends pas la boucle.");
  });

  it("refuse un commentaire de plus de 500 caracteres, apprenant ou formateur (RG-31, A12)", async () => {
    const { service } = monter();
    const trop = "a".repeat(501);
    await expect(service.publierApprenant("awa", "PY-FON-012", trop)).rejects.toBeInstanceOf(ErreurCommentaire);
    await expect(service.publierFormateur("awa", "PY-FON-012", trop)).rejects.toBeInstanceOf(ErreurCommentaire);
    // 500 pile passe.
    await expect(service.publierApprenant("awa", "PY-FON-012", "a".repeat(500))).resolves.toBeDefined();
  });

  it("refuse un commentaire vide", async () => {
    const { service } = monter();
    await expect(service.publierApprenant("awa", "PY-FON-012", "   ")).rejects.toBeInstanceOf(ErreurCommentaire);
  });

  it("refuse le quatrieme commentaire de suite sans reponse sur l'exercice (RG-32, A13)", async () => {
    const { service } = monter();
    for (let i = 0; i < 3; i++) await service.publierApprenant("awa", "PY-FON-012", "message " + i);
    await expect(service.publierApprenant("awa", "PY-FON-012", "le quatrieme")).rejects.toBeInstanceOf(ErreurCommentaire);
    // La reponse du formateur ouvre une nouvelle serie de 3.
    await service.publierFormateur("awa", "PY-FON-012", "reponse");
    await expect(service.publierApprenant("awa", "PY-FON-012", "apres la reponse")).resolves.toBeDefined();
  });

  it("la limite de suite est par exercice, pas globale", async () => {
    const { service } = monter();
    for (let i = 0; i < 3; i++) await service.publierApprenant("awa", "PY-FON-012", "message " + i);
    // Un autre exercice n'est pas bloque.
    await expect(service.publierApprenant("awa", "PY-FON-015", "autre exercice")).resolves.toBeDefined();
  });

  it("refuse le onzieme commentaire du jour, tous exercices confondus (RG-33, A14)", async () => {
    const { service } = monter();
    // 10 commentaires repartis, chaque exercice recevant une reponse du formateur
    // pour ne pas buter sur RG-32.
    for (let i = 0; i < 10; i++) {
      const exo = "EX-" + i;
      await service.publierApprenant("awa", exo, "message");
    }
    await expect(service.publierApprenant("awa", "EX-neuf", "le onzieme")).rejects.toBeInstanceOf(ErreurCommentaire);
  });

  it("le compteur quotidien repart a zero le lendemain (RG-33)", async () => {
    const { service, h } = monter();
    for (let i = 0; i < 10; i++) await service.publierApprenant("awa", "EX-" + i, "message");
    await expect(service.publierApprenant("awa", "EX-x", "onzieme")).rejects.toBeInstanceOf(ErreurCommentaire);
    h.fixer(JOUR2);
    await expect(service.publierApprenant("awa", "EX-x", "demain")).resolves.toBeDefined();
  });

  it("le formateur n'a pas de limite en nombre (RG-32, RG-33)", async () => {
    const { service } = monter();
    for (let i = 0; i < 15; i++) {
      await expect(service.publierFormateur("awa", "PY-FON-012", "note " + i)).resolves.toBeDefined();
    }
  });

  it("le fil d'un apprenant est separe de celui d'un autre (ENF-05)", async () => {
    const { service } = monter();
    await service.publierApprenant("awa", "PY-FON-012", "message d'Awa");
    const filBen = await service.fil("ben", "PY-FON-012");
    expect(filBen).toHaveLength(0);
  });
});
