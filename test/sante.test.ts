import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

// Socle : la route de sante repond. Ce test verifie seulement que la chaine
// de test fonctionne, il ne porte pas d'identifiant de specification.
describe("socle", () => {
  it("la route de sante repond 200", async () => {
    const res = await SELF.fetch("https://exemple.test/sante");
    expect(res.status).toBe(200);
    const corps = await res.json();
    expect(corps).toEqual({ ok: true, service: "beek" });
  });
});
