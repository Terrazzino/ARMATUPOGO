import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/202610260003_event_images_storage.sql"), "utf8").toLowerCase();

describe("migración RLS de flyers", () => {
  it("comprueba evento real, ownership y rol con nombres físicos de Prisma", () => {
    expect(sql).toContain("from public.eventos");
    expect(sql).toContain("event.organizer_id = (select auth.uid())");
    expect(sql).toContain("organizer.role = 'organizador'");
    expect(sql).toContain("private.user_owns_event");
  });

  it("limita rutas, operaciones y formatos", () => {
    expect(sql).toContain("bucket_id = 'event-images'");
    expect(sql).toContain("(storage.foldername(name))[2] = 'events'");
    expect(sql).toContain("for insert\nto authenticated");
    expect(sql).toContain("for delete\nto authenticated");
    expect(sql).toContain("storage.allow_only_operation('storage.object.delete_many')");
    expect(sql).not.toMatch(/create policy[\s\S]*?for update/);
  });

  it("no sobrescribe un bucket incompatible", () => {
    expect(sql).toContain("if not found then");
    expect(sql).toContain("configuración incompatible");
    expect(sql).not.toContain("on conflict (id) do update");
  });
});
