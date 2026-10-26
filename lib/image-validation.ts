import { ValidationError } from "@/lib/errors";

export type SupportedImageMetadata = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
};

export type ImageValidationLimits = {
  maxBytes: number;
  maxSizeLabel: string;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  maxPixels: number;
  dimensionsLabel: string;
};

const MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function readUint24LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readUint16LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32BE(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function parsePng(bytes: Uint8Array): SupportedImageMetadata | null {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 24 || !signature.every((value, index) => bytes[index] === value)) return null;
  if (ascii(bytes, 12, 4) !== "IHDR") return null;

  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const chunkLength = readUint32BE(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    if (type === "acTL") throw new ValidationError("Las imágenes animadas no están permitidas");
    if (type === "IEND") break;
    offset += 12 + chunkLength;
  }

  return {
    mimeType: "image/png",
    extension: "png",
    width: readUint32BE(bytes, 16),
    height: readUint32BE(bytes, 20),
  };
}

function parseJpeg(bytes: Uint8Array): SupportedImageMetadata | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) break;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    const isStartOfFrame = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker);
    if (isStartOfFrame && segmentLength >= 7 && offset + 7 <= bytes.length) {
      return {
        mimeType: "image/jpeg",
        extension: "jpg",
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }
    if (segmentLength < 2) break;
    offset += segmentLength;
  }
  throw new ValidationError("No se pudieron validar las dimensiones de la imagen JPG");
}

function parseWebp(bytes: Uint8Array): SupportedImageMetadata | null {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
  const chunkType = ascii(bytes, 12, 4);
  let width = 0;
  let height = 0;

  if (chunkType === "VP8X") {
    if ((bytes[20] & 0x02) !== 0) throw new ValidationError("Las imágenes animadas no están permitidas");
    width = 1 + readUint24LE(bytes, 24);
    height = 1 + readUint24LE(bytes, 27);
  } else if (chunkType === "VP8 ") {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) throw new ValidationError("El archivo WebP no es válido");
    width = readUint16LE(bytes, 26) & 0x3fff;
    height = readUint16LE(bytes, 28) & 0x3fff;
  } else if (chunkType === "VP8L") {
    if (bytes[20] !== 0x2f) throw new ValidationError("El archivo WebP no es válido");
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    width = (bits & 0x3fff) + 1;
    height = ((bits >> 14) & 0x3fff) + 1;
  } else {
    throw new ValidationError("El archivo WebP no es válido");
  }

  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = ascii(bytes, offset, 4);
    const size = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset + 4, true);
    if (type === "ANIM" || type === "ANMF") throw new ValidationError("Las imágenes animadas no están permitidas");
    offset += 8 + size + (size % 2);
  }
  return { mimeType: "image/webp", extension: "webp", width, height };
}

export async function validateImageFile(file: File, limits: ImageValidationLimits): Promise<SupportedImageMetadata> {
  if (!(file instanceof File) || file.size === 0) throw new ValidationError("Seleccioná una imagen válida");
  if (file.size > limits.maxBytes) throw new ValidationError(`La imagen no puede superar los ${limits.maxSizeLabel}`);
  if (!MIME_TYPES.has(file.type)) throw new ValidationError("La imagen debe ser JPG, PNG o WebP");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const metadata = parsePng(bytes) ?? parseJpeg(bytes) ?? parseWebp(bytes);
  if (!metadata || metadata.mimeType !== file.type) {
    throw new ValidationError("El contenido de la imagen no coincide con su formato declarado");
  }
  const { width, height } = metadata;
  if (width < limits.minWidth || height < limits.minHeight || width > limits.maxWidth || height > limits.maxHeight || width * height > limits.maxPixels) {
    throw new ValidationError(`La imagen debe medir ${limits.dimensionsLabel}`);
  }
  return metadata;
}
