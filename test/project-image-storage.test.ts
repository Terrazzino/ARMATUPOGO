import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { removeProjectImage, uploadProjectImage } from "@/lib/services/project-image-storage";

function validPng() {
  const bytes = new Uint8Array(32);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  new DataView(bytes.buffer).setUint32(8, 13, false);
  bytes.set([73, 72, 68, 82], 12);
  new DataView(bytes.buffer).setUint32(16, 128, false);
  new DataView(bytes.buffer).setUint32(20, 128, false);
  return new File([bytes], "nombre original inseguro.png", { type: "image/png" });
}

describe("servicio de Storage para proyectos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ upload: mocks.upload, remove: mocks.remove, getPublicUrl: mocks.getPublicUrl });
    mocks.createClient.mockResolvedValue({ storage: { from: mocks.from } });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.getPublicUrl.mockImplementation((path: string) => ({ data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/project-images/${path}` } }));
  });

  it("sube con la sesión SSR, nombre aleatorio y sin sobrescritura", async () => {
    const userId = crypto.randomUUID();
    const projectId = crypto.randomUUID();
    const result = await uploadProjectImage(userId, projectId, validPng());

    expect(mocks.from).toHaveBeenCalledWith("project-images");
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${userId}/projects/${projectId}/[0-9a-f-]{36}\\.png$`, "i")),
      expect.any(File),
      { contentType: "image/png", cacheControl: "31536000", upsert: false }
    );
    expect(result.publicUrl).toContain("/project-images/");
  });

  it("elimina únicamente la ruta explícita recibida", async () => {
    const path = `${crypto.randomUUID()}/projects/${crypto.randomUUID()}/${crypto.randomUUID()}.webp`;
    await expect(removeProjectImage(path)).resolves.toBe(true);
    expect(mocks.remove).toHaveBeenCalledWith([path]);
  });

  it("informa configuración incompleta sin intentar una carga", async () => {
    mocks.createClient.mockResolvedValue(null);
    await expect(uploadProjectImage(crypto.randomUUID(), crypto.randomUUID(), validPng())).rejects.toMatchObject({ code: "CONFIGURATION_ERROR" });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
