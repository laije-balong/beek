// Sous-ensemble de l'API Workers KV que le stockage des images utilise. Il evite
// une dependance de types. Un vrai espace KV satisfait cette interface par sa forme.
export interface StockageKV {
  put(
    cle: string,
    valeur: ArrayBuffer | ArrayBufferView | string,
    options?: { metadata?: unknown }
  ): Promise<void>;
  getWithMetadata(
    cle: string,
    options: { type: "arrayBuffer" }
  ): Promise<{ value: ArrayBuffer | null; metadata: unknown }>;
}
