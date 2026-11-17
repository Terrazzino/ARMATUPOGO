import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

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
  const sql1 = fs.readFileSync(projectStorageMigration, "utf8");
  execSync("npx supabase db query", { input: sql1, stdio: ["pipe", "inherit", "inherit"] });

  const sql2 = fs.readFileSync(eventStorageMigration, "utf8");
  execSync("npx supabase db query", { input: sql2, stdio: ["pipe", "inherit", "inherit"] });

  console.log("[E2E Setup] Buckets y políticas de Storage aplicados correctamente.");
} catch (error) {
  console.error("[E2E Setup] Error al aplicar migraciones de Storage:", error.message);
  process.exit(1);
}
