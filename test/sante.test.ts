import { describe, it, expect } from "vitest";
import app from "../src/index";

// Socle : la route de sante repond. Ce test verifie seulement que la chaine
// de test fonctionne, il ne porte pas d'identifiant de specification.
describe("socle", () => {
  it("la route de sante repond 200", async () => {
    const res = await app.request("/sante");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, service: "beek" });
  });
});
