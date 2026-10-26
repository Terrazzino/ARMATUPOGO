import { describe, expect, it } from "vitest";
import { buildEventImagePath, getOwnedEventImagePath, validateEventImage } from "@/lib/event-image";
import { EVENT_IMAGE_MAX_BYTES } from "@/lib/event-image-constraints";

function png(width = 800, height = 1000, animated = false) {
  const bytes = new Uint8Array(animated ? 45 : 32);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  new DataView(bytes.buffer).setUint32(8, 13, false);
  bytes.set([73, 72, 68, 82], 12);
  new DataView(bytes.buffer).setUint32(16, width, false);
  new DataView(bytes.buffer).setUint32(20, height, false);
  if (animated) bytes.set([97, 99, 84, 76], 37);
  return bytes;
}

describe("validación de flyers", () => {
  it("acepta un PNG real dentro de los límites", async () => {
    await expect(validateEventImage(new File([png()], "flyer.png", { type: "image/png" }))).resolves.toMatchObject({ width: 800, height: 1000 });
  });

  it("rechaza firma falsa, animación, dimensiones y tamaño inválidos", async () => {
    await expect(validateEventImage(new File(["fake"], "flyer.png", { type: "image/png" }))).rejects.toThrow("contenido");
    await expect(validateEventImage(new File([png(800, 1000, true)], "flyer.png", { type: "image/png" }))).rejects.toThrow("animadas");
    await expect(validateEventImage(new File([png(300, 400)], "flyer.png", { type: "image/png" }))).rejects.toThrow("400×500");
    await expect(validateEventImage(new File([new Uint8Array(EVENT_IMAGE_MAX_BYTES + 1)], "flyer.png", { type: "image/png" }))).rejects.toThrow("5 MiB");
  });

  it("genera rutas aleatorias y sólo reconoce flyers del propietario y evento", () => {
    const userId = crypto.randomUUID();
    const eventId = crypto.randomUUID();
    const path = buildEventImagePath(userId, eventId, "webp");
    const url = `https://example.supabase.co/storage/v1/object/public/event-images/${path}`;
    expect(path).toMatch(new RegExp(`^${userId}/events/${eventId}/[0-9a-f-]{36}\\.webp$`, "i"));
    expect(getOwnedEventImagePath(url, userId, eventId)).toBe(path);
    expect(getOwnedEventImagePath(url, crypto.randomUUID(), eventId)).toBeNull();
    expect(getOwnedEventImagePath(url, userId, crypto.randomUUID())).toBeNull();
  });
});
