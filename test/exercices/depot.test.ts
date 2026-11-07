import { describe, it, expect } from "vitest";
import { DepotExercicesMemoire } from "../../src/exercices/depot-memoire";
import { EXERCICES_RECETTE } from "../../src/exercices/donnees/recette";
import { contexteControle } from "../../src/fabrique";
import { controler } from "../../src/exercices/controles";
import { ServiceContenu } from "../../src/contenu/service";
import { DepotContenuMemoire } from "../../src/contenu/depot-memoire";
import type { Exercice } from "../../src/exercices/types";

describe("persistance des exercices", () => {
  it("conserve un exercice a l'identique, contenu du type compris (aller-retour)", async () => {
    const depot = new DepotExercicesMemoire();
    const ex = EXERCICES_RECETTE[0];
    await depot.creer(ex);
    const relu = await depot.parIdentifiant(ex.identifiant);
    expect(relu).toEqual(ex);
    expect(relu?.contenu.type).toBe("T05");
  });

  it("existe et compte par notion et par fil rouge", async () => {
    const depot = new DepotExercicesMemoire();
    for (const e of EXERCICES_RECETTE) await depot.creer(e);
    expect(await depot.existeIdentifiant("MACH-DEC-S08E03")).toBe(true);
    expect(await depot.existeIdentifiant("INCONNU")).toBe(false);
    expect(await depot.nombreParNotion("logi-s6")).toBe(1);
    expect(await depot.nombreParFilRouge("cyber-mwinda")).toBe(3);
  });

  it("remplace un exercice de meme identifiant", async () => {
    const depot = new DepotExercicesMemoire();
    const ex = EXERCICES_RECETTE[0];
    await depot.creer(ex);
    await depot.remplacer({ ...structuredClone(ex), titre: "Nouveau titre" });
    expect((await depot.parIdentifiant(ex.identifiant))?.titre).toBe("Nouveau titre");
  });

  it("le contexte des controles valide notion, fil rouge et identifiant (controles 3 et 4)", async () => {
    const depotContenu = new DepotContenuMemoire();
    const service = new ServiceContenu(depotContenu);
    const dom = await service.creerDomaine("Logique et resolution de problemes");
    const { niveaux } = await service.creerFiliere(dom.id, "Logique");
    const notion = await service.creerNotion(niveaux[0].id, "Decouper un probleme");
    const fr = await service.creerFilRouge("Cyber Mwinda", "");
    const depotEx = new DepotExercicesMemoire();
    const ctx = contexteControle(depotContenu, depotEx);

    const ex: Exercice = {
      ...structuredClone(EXERCICES_RECETTE[2]),
      notionId: notion.id,
      filRougeId: fr.id,
    };
    expect(await controler(ex, ctx)).toEqual([]);

    // Une fois l'exercice enregistre, son identifiant n'est plus libre.
    await depotEx.creer(ex);
    expect((await controler(ex, ctx)).some((x) => x.regle.startsWith("controle 4"))).toBe(true);

    // Une notion inexistante leve le controle 3.
    const exAbsente: Exercice = {
      ...structuredClone(ex),
      identifiant: "AUTRE-ID",
      notionId: "notion-absente",
    };
    expect((await controler(exAbsente, ctx)).some((x) => x.regle.startsWith("controle 3"))).toBe(
      true
    );
  });
});
