export function toHex(a: Uint8Array): string {
  return Array.from(a)
    .map((o) => o.toString(16).padStart(2, "0"))
    .join("");
}

export function fromHex(h: string): Uint8Array {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
