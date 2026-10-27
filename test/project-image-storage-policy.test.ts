import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/202610260002_project_images_storage.sql"),
  "utf8"
).toLowerCase().replace(/\r\n/g, "\n");

describe("migración RLS de imágenes de proyectos", () => {
  it("valida ownership contra la tabla y columnas reales de Prisma", () => {
    expect(sql).toContain("from public.proyectos_musicales");
    expect(sql).toContain("project.user_id = (select auth.uid())");
    expect(sql).toContain("private.user_owns_musical_project");
  });

  it("limita INSERT a sesión, carpeta propia, proyecto real y extensiones permitidas", () => {
    expect(sql).toContain("for insert\nto authenticated");
    expect(sql).toContain("owner_id = (select auth.uid()::text)");
    expect(sql).toContain("array_length(storage.foldername(name), 1) = 3");
    expect(sql).toContain("lower(storage.extension(name)) in ('jpg', 'png', 'webp')");
    expect(sql).toContain("storage.filename(name) ~*");
  });

  it("permite DELETE propio y SELECT sólo para la operación interna de remove", () => {
    expect(sql).toContain("for delete\nto authenticated");
    expect(sql).toContain("for select\nto authenticated");
    expect(sql).toContain("storage.allow_only_operation('storage.object.delete_many')");
    expect(sql).not.toMatch(/create policy[\s\S]*?for update/);
    expect(sql).not.toContain("storage.object.list");
  });

  it("crea el bucket sólo si falta y falla ante configuración incompatible", () => {
    expect(sql).toContain("if not found then");
    expect(sql).toContain("configuración incompatible");
    expect(sql).not.toContain("on conflict (id) do update");
  });
});
