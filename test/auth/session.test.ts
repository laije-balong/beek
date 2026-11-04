import { describe, it, expect } from "vitest";
import { SignataireSession, DUREE_SESSION } from "../../src/auth/session";

const SECRET = "secret-de-session-de-test";

describe("sessions", () => {
  it("relit une session valide (US-01)", async () => {
    const s = new SignataireSession(SECRET);
    const jeton = await s.creer("id-123", "formateur", 1_000_000);
    const contenu = await s.lire(jeton, 1_000_000);
    expect(contenu).toEqual({ id: "id-123", role: "formateur" });
  });

  it("rejette une session expiree apres 2 heures d'inactivite (US-01, RG-07)", async () => {
    const s = new SignataireSession(SECRET);
    const jeton = await s.creer("id-123", "apprenant", 1_000_000);
    expect(await s.lire(jeton, 1_000_000 + DUREE_SESSION + 1)).toBeNull();
  });

  it("rejette un jeton modifie", async () => {
    const s = new SignataireSession(SECRET);
    const jeton = await s.creer("id-123", "apprenant", 1_000_000);
    const points = jeton.split(".");
    const falsifie = points[0].slice(0, -1) + (points[0].endsWith("A") ? "B" : "A") + "." + points[1];
    expect(await s.lire(falsifie, 1_000_000)).toBeNull();
  });

  it("rejette un jeton signe avec un autre secret", async () => {
    const jeton = await new SignataireSession("autre-secret").creer("id-123", "apprenant", 1_000_000);
    const s = new SignataireSession(SECRET);
    expect(await s.lire(jeton, 1_000_000)).toBeNull();
  });

  it("rejette un jeton mal forme", async () => {
    const s = new SignataireSession(SECRET);
    expect(await s.lire("nimportequoi", 1_000_000)).toBeNull();
    expect(await s.lire("a.b.c", 1_000_000)).toBeNull();
  });
});
