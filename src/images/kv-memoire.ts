import type { StockageKV } from "./kv";

// Espace KV en memoire, pour les tests.
export class StockageKVMemoire implements StockageKV {
  readonly #valeurs = new Map<string, { value: ArrayBuffer; metadata: unknown }>();

  async put(
    cle: string,
    valeur: ArrayBuffer | ArrayBufferView | string,
    options?: { metadata?: unknown }
  ): Promise<void> {
    let octets: ArrayBuffer;
    if (typeof valeur === "string") {
      octets = new TextEncoder().encode(valeur).buffer as ArrayBuffer;
    } else if (valeur instanceof ArrayBuffer) {
      octets = valeur;
    } else {
      octets = valeur.buffer.slice(
        valeur.byteOffset,
        valeur.byteOffset + valeur.byteLength
      ) as ArrayBuffer;
    }
    this.#valeurs.set(cle, { value: octets, metadata: options?.metadata ?? null });
  }

  async getWithMetadata(
    cle: string,
    _options: { type: "arrayBuffer" }
  ): Promise<{ value: ArrayBuffer | null; metadata: unknown }> {
    const trouve = this.#valeurs.get(cle);
    if (!trouve) return { value: null, metadata: null };
    return { value: trouve.value, metadata: trouve.metadata };
  }
}
