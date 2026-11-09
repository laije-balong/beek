import { describe, it, expect } from "vitest";
import { ServiceImages, ErreurImage, nettoyerSvg } from "../../src/images/service";
import { StockageKVMemoire } from "../../src/images/kv-memoire";

function octetsDe(texte: string): ArrayBuffer {
  return new TextEncoder().encode(texte).buffer as ArrayBuffer;
}

describe("stockage des images (point 3.2, referentiel 4.5)", () => {
  it("enregistre une image et la relit", async () => {
    const service = new ServiceImages(new StockageKVMemoire());
    const image = await service.stocker(octetsDe("faux-png"), "png", "un schema");
    expect(image.format).toBe("png");
    expect(image.cle).toBeTruthy();
    const lue = await service.lire(image.cle);
    expect(lue?.format).toBe("png");
    expect(new TextDecoder().decode(lue!.octets)).toBe("faux-png");
  });

  it("refuse un format non accepte", async () => {
    const service = new ServiceImages(new StockageKVMemoire());
    // @ts-expect-error format volontairement invalide
    await expect(service.stocker(octetsDe("x"), "gif", "")).rejects.toBeInstanceOf(ErreurImage);
  });

  it("refuse une image au-dela de 200 Ko", async () => {
    const service = new ServiceImages(new StockageKVMemoire());
    const trop = new ArrayBuffer(200 * 1024 + 1);
    await expect(service.stocker(trop, "png", "")).rejects.toBeInstanceOf(ErreurImage);
  });

  it("nettoie le SVG de tout script avant de l'enregistrer", async () => {
    const service = new ServiceImages(new StockageKVMemoire());
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect onload="x()"/></svg>';
    const image = await service.stocker(octetsDe(svg), "svg", "");
    const lue = await service.lire(image.cle);
    const texte = new TextDecoder().decode(lue!.octets);
    expect(texte).not.toContain("<script>");
    expect(texte).not.toContain("onload");
  });

  it("nettoyerSvg retire scripts, gestionnaires et javascript:", () => {
    const sale = '<script>a()</script><a href="javascript:b()" onclick="c()">x</a>';
    const propre = nettoyerSvg(sale);
    expect(propre).not.toContain("<script>");
    expect(propre).not.toContain("onclick");
    expect(propre).not.toContain("javascript:");
  });

  it("une cle inconnue renvoie null", async () => {
    const service = new ServiceImages(new StockageKVMemoire());
    expect(await service.lire("inconnue")).toBeNull();
  });
});
