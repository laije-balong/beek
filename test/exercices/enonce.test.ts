import { describe, it, expect } from "vitest";
import { enonceVersHtml } from "../../src/exercices/enonce";

describe("rendu de l'enonce (points 3.3 et 3.4a)", () => {
  it("echappe le HTML, aucune injection possible", () => {
    const h = enonceVersHtml("<script>alert(1)</script>");
    expect(h).not.toContain("<script>");
    expect(h).toContain("&lt;script&gt;");
  });

  it("rend le gras et le code en ligne", () => {
    const h = enonceVersHtml("Le mot **calcul** vient de `calculus`.");
    expect(h).toContain("<strong>calcul</strong>");
    expect(h).toContain("<code>calculus</code>");
  });

  it("rend les titres et les listes", () => {
    const h = enonceVersHtml("## Tarifs\n- impression\n- internet");
    expect(h).toContain("<h2>Tarifs</h2>");
    expect(h).toContain("<ul><li>impression</li><li>internet</li></ul>");
  });

  it("rend un bloc de code a chasse fixe, indentation conservee", () => {
    const h = enonceVersHtml("```\nPOUR i DE 1 A 3 FAIRE\n    ECRIRE i\nFINPOUR\n```");
    expect(h).toContain('<pre class="code">');
    expect(h).toContain("    ECRIRE i");
  });

  it("affiche sans erreur les majuscules accentuees (3.4a)", () => {
    const h = enonceVersHtml("```\nx : RÉEL\nnom : CHAÎNE\n```");
    expect(h).toContain("RÉEL");
    expect(h).toContain("CHAÎNE");
  });

  it("rend un tableau simple (3.3)", () => {
    const h = enonceVersHtml("| Position | Valeur |\n| --- | --- |\n| 8 | 1 |\n| 4 | 0 |");
    expect(h).toContain("<table>");
    expect(h).toContain("<th>Position</th>");
    expect(h).toContain("<td>8</td>");
    expect(h).toContain("<td>0</td>");
  });

  it("garde le texte simple en paragraphe", () => {
    const h = enonceVersHtml("Une phrase simple.");
    expect(h).toBe("<p>Une phrase simple.</p>");
  });
});
