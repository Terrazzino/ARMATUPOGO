import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const supabaseCli = path.join(
  path.dirname(require.resolve("supabase/package.json")),
  "dist/supabase.js"
);

const projectStorageMigration = path.resolve(
  process.cwd(),
  "supabase/migrations/202610260002_project_images_storage.sql"
);
const eventStorageMigration = path.resolve(
  process.cwd(),
  "supabase/migrations/202610260003_event_images_storage.sql"
);

console.log("[E2E Setup] Aplicando migraciones de Supabase Storage...");
try {
  for (const migration of [projectStorageMigration, eventStorageMigration]) {
    console.log(`[E2E Setup] Aplicando ${path.basename(migration)}...`);
    execFileSync(process.execPath, [supabaseCli, "db", "query", "--file", migration], {
      stdio: "inherit",
    });
  }

  console.log("[E2E Setup] Buckets y políticas de Storage aplicados correctamente.");
} catch (error) {
  console.error("[E2E Setup] Error al aplicar migraciones de Storage:", error.message);
  process.exit(1);
}
