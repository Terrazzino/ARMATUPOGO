import { describe, expect, it } from "vitest";
import {
  PROJECT_IMAGE_MAX_BYTES,
  buildProjectImagePath,
  getOwnedProjectImagePath,
  validateProjectImage,
} from "@/lib/project-image";

function png(width = 128, height = 128, animated = false) {
  const bytes = new Uint8Array(animated ? 45 : 32);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  new DataView(bytes.buffer).setUint32(8, 13, false);
  bytes.set([73, 72, 68, 82], 12);
  new DataView(bytes.buffer).setUint32(16, width, false);
  new DataView(bytes.buffer).setUint32(20, height, false);
  if (animated) {
    new DataView(bytes.buffer).setUint32(33, 0, false);
    bytes.set([97, 99, 84, 76], 37);
  }
  return bytes;
}

describe("validación de imágenes de proyectos", () => {
  it("acepta PNG real dentro de los límites", async () => {
    const result = await validateProjectImage(new File([png()], "logo.png", { type: "image/png" }));
    expect(result).toMatchObject({ mimeType: "image/png", width: 128, height: 128 });
  });

  it("rechaza MIME permitido con contenido diferente", async () => {
    await expect(validateProjectImage(new File(["no es una imagen"], "logo.png", { type: "image/png" }))).rejects.toThrow("contenido");
  });

  it("rechaza SVG y archivos mayores al límite", async () => {
    await expect(validateProjectImage(new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" }))).rejects.toThrow("JPG, PNG o WebP");
    const oversized = new File([new Uint8Array(PROJECT_IMAGE_MAX_BYTES + 1)], "logo.png", { type: "image/png" });
    await expect(validateProjectImage(oversized)).rejects.toThrow("5 MiB");
  });

  it("rechaza dimensiones insuficientes e imágenes PNG animadas", async () => {
    await expect(validateProjectImage(new File([png(32, 32)], "small.png", { type: "image/png" }))).rejects.toThrow("64×64");
    await expect(validateProjectImage(new File([png(128, 128, true)], "animated.png", { type: "image/png" }))).rejects.toThrow("animadas");
  });

  it("genera rutas sin usar el nombre original y sólo reconoce objetos propios", () => {
    const userId = crypto.randomUUID();
    const projectId = crypto.randomUUID();
    const path = buildProjectImagePath(userId, projectId, "webp");
    expect(path).toMatch(new RegExp(`^${userId}/projects/${projectId}/[0-9a-f-]{36}\\.webp$`, "i"));

    const url = `https://example.supabase.co/storage/v1/object/public/project-images/${path}`;
    expect(getOwnedProjectImagePath(url, userId, projectId)).toBe(path);
    expect(getOwnedProjectImagePath(url, crypto.randomUUID(), projectId)).toBeNull();
    expect(getOwnedProjectImagePath("https://images.example.com/logo.webp", userId, projectId)).toBeNull();
  });
});
