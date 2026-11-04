import { describe, it, expect } from "vitest";
import {
  refusMotDePasse,
  LONGUEUR_MIN,
} from "../../src/auth/politique-mot-de-passe";

describe("politique de mot de passe (RG-08)", () => {
  it("refuse un mot de passe de moins de 8 caracteres (RG-08)", () => {
    expect(refusMotDePasse("court")).not.toBeNull();
    expect(refusMotDePasse("1234567")).not.toBeNull();
  });

  it("refuse un mot de passe parmi les plus courants (RG-08)", () => {
    expect(refusMotDePasse("password")).not.toBeNull();
    expect(refusMotDePasse("azertyuiop")).not.toBeNull();
    expect(refusMotDePasse("motdepasse")).not.toBeNull();
  });

  it("refuse un mot de passe courant quelle que soit la casse (RG-08)", () => {
    expect(refusMotDePasse("Azerty")).not.toBeNull();
    expect(refusMotDePasse("PASSWORD")).not.toBeNull();
  });

  it("accepte un mot de passe assez long sans regle de complexite (RG-08)", () => {
    // Huit caracteres, aucune complexite exigee, absent de la liste.
    expect(refusMotDePasse("jardinvert")).toBeNull();
    expect(refusMotDePasse("montagnebleue")).toBeNull();
  });

  it("accepte pile a la longueur minimale et refuse juste en dessous (RG-08)", () => {
    const pile = "a".repeat(LONGUEUR_MIN - 1) + "z"; // longueur = LONGUEUR_MIN
    const dessous = "a".repeat(LONGUEUR_MIN - 1); // longueur = LONGUEUR_MIN - 1
    expect(pile.length).toBe(LONGUEUR_MIN);
    expect(refusMotDePasse(pile)).toBeNull();
    expect(refusMotDePasse(dessous)).not.toBeNull();
  });
});
