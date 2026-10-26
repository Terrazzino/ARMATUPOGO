import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), from: vi.fn(), upload: vi.fn(), remove: vi.fn(), getPublicUrl: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { removeEventImage, uploadEventImage } from "@/lib/services/event-image-storage";

function validFlyer() {
  const bytes = new Uint8Array(32);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  new DataView(bytes.buffer).setUint32(8, 13, false);
  bytes.set([73, 72, 68, 82], 12);
  new DataView(bytes.buffer).setUint32(16, 800, false);
  new DataView(bytes.buffer).setUint32(20, 1000, false);
  return new File([bytes], "nombre no confiable.png", { type: "image/png" });
}

describe("servicio de Storage para flyers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ upload: mocks.upload, remove: mocks.remove, getPublicUrl: mocks.getPublicUrl });
    mocks.createClient.mockResolvedValue({ storage: { from: mocks.from } });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.getPublicUrl.mockImplementation((path: string) => ({ data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/event-images/${path}` } }));
  });

  it("sube al bucket y ruta propios sin sobrescritura", async () => {
    const userId = crypto.randomUUID();
    const eventId = crypto.randomUUID();
    const result = await uploadEventImage(userId, eventId, validFlyer());
    expect(mocks.from).toHaveBeenCalledWith("event-images");
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${userId}/events/${eventId}/[0-9a-f-]{36}\\.png$`, "i")),
      expect.any(File),
      { contentType: "image/png", cacheControl: "31536000", upsert: false }
    );
    expect(result.publicUrl).toContain("/event-images/");
  });

  it("normaliza fallos de Storage y elimina sólo la ruta explícita", async () => {
    mocks.upload.mockResolvedValue({ error: { statusCode: "403" } });
    await expect(uploadEventImage(crypto.randomUUID(), crypto.randomUUID(), validFlyer())).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });

    const path = `${crypto.randomUUID()}/events/${crypto.randomUUID()}/${crypto.randomUUID()}.webp`;
    await expect(removeEventImage(path)).resolves.toBe(true);
    expect(mocks.remove).toHaveBeenCalledWith([path]);
  });
});
