import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function getSupabaseStatus() {
  try {
    const raw = execSync("npx supabase status -o json", { encoding: "utf8" });
    return JSON.parse(raw);
  } catch (err) {
    console.error("[E2E Setup] Error al obtener el estado de Supabase Local:", err.message);
    process.exit(1);
  }
}

const status = getSupabaseStatus();
const port = process.env.PORT || "3100";
const apiUrl = status.API_URL || "http://127.0.0.1:54321";
const anonKey = status.ANON_KEY || status.PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = status.SERVICE_ROLE_KEY || status.SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = status.DB_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const databaseUrl = `${dbUrl}?schema=public`;

if (!anonKey || !serviceRoleKey) {
  console.error("[E2E Setup] Faltan las claves anon o service_role en Supabase status.");
  process.exit(1);
}

const envContent = [
  `# =====================================================================`,
  `# ARMA TU POGO - ENTORNO E2E LOCAL GENERADO AUTOMATICAMENTE`,
  `# =====================================================================`,
  `PORT=${port}`,
  `DATABASE_URL="${databaseUrl}"`,
  `DIRECT_URL="${dbUrl}"`,
  `NEXT_PUBLIC_SUPABASE_URL="${apiUrl}"`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY="${anonKey}"`,
  `SUPABASE_SERVICE_ROLE_KEY="${serviceRoleKey}"`,
  `NEXT_PUBLIC_APP_URL="http://127.0.0.1:${port}"`,
  `PLAYWRIGHT_TEST_BASE_URL="http://127.0.0.1:${port}"`,
  "",
].join("\n");

const envPath = path.resolve(process.cwd(), ".env.e2e");
fs.writeFileSync(envPath, envContent, "utf8");
console.log(`[E2E Setup] Archivo .env.e2e generado exitosamente desde Supabase Local.`);
