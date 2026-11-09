// Stockage des images dans Workers KV, hors de la base, sans abonnement (point
// 3.2, referentiel 4.5). Formats acceptes : WebP, PNG, SVG. Taille au plus 200 Ko.
// Les SVG sont nettoyes de tout script a l'enregistrement, et servis avec une
// politique qui bloque les scripts, en plus d'etre affiches par une balise image.

import type { StockageKV } from "./kv";
import { TAILLE_IMAGE_MAX, type FormatImage, type ImageExercice } from "../exercices/types";

export class ErreurImage extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurImage";
  }
}

const FORMATS: FormatImage[] = ["webp", "png", "svg"];

export function typeMime(format: FormatImage): string {
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return "image/svg+xml";
}

// Retire les scripts et les gestionnaires d'evenements d'un SVG. Garde-fou en
// plus de l'affichage par balise image.
export function nettoyerSvg(texte: string): string {
  return texte
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

interface MetaImage {
  format: FormatImage;
  octets: number;
  texteAlternatif: string;
}

export interface ImageLue {
  octets: ArrayBuffer;
  format: FormatImage;
}

export class ServiceImages {
  readonly #kv: StockageKV;

  constructor(kv: StockageKV) {
    this.#kv = kv;
  }

  // Enregistre une image et renvoie sa reference. Refuse un format non accepte ou
  // une taille au-dela de 200 Ko (controle 9 du referentiel).
  async stocker(
    octets: ArrayBuffer,
    format: FormatImage,
    texteAlternatif: string
  ): Promise<ImageExercice> {
    if (!FORMATS.includes(format)) {
      throw new ErreurImage("format non accepte, attendu WebP, PNG ou SVG");
    }
    let donnees: ArrayBuffer = octets;
    if (format === "svg") {
      const propre = nettoyerSvg(new TextDecoder().decode(octets));
      donnees = new TextEncoder().encode(propre).buffer as ArrayBuffer;
    }
    if (donnees.byteLength > TAILLE_IMAGE_MAX) {
      throw new ErreurImage("image au-dela de 200 Ko");
    }
    const cle = crypto.randomUUID();
    const meta: MetaImage = { format, octets: donnees.byteLength, texteAlternatif };
    await this.#kv.put(cle, donnees, { metadata: meta });
    return { cle, octets: donnees.byteLength, format, texteAlternatif };
  }

  async lire(cle: string): Promise<ImageLue | null> {
    const { value, metadata } = await this.#kv.getWithMetadata(cle, { type: "arrayBuffer" });
    if (value === null || metadata === null) return null;
    const meta = metadata as MetaImage;
    return { octets: value, format: meta.format };
  }
}
