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

function getLocalDatabaseEnvironment() {
  const rawStatus = execFileSync(process.execPath, [supabaseCli, "status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  const status = JSON.parse(rawStatus);

  if (!status.DB_URL) {
    throw new Error("Supabase Local no informó DB_URL.");
  }

  const databaseUrl = new URL(status.DB_URL);
  const allowedHosts = new Set(["localhost", "127.0.0.1"]);
  const allowedProtocols = new Set(["postgres:", "postgresql:"]);

  if (!allowedProtocols.has(databaseUrl.protocol)) {
    throw new Error("La conexión local de Supabase no utiliza el protocolo PostgreSQL.");
  }

  if (!allowedHosts.has(databaseUrl.hostname)) {
    throw new Error(
      `Se rechazó la conexión de Storage: ${databaseUrl.hostname} no es un host local permitido.`
    );
  }

  if (
    !databaseUrl.port ||
    !databaseUrl.username ||
    !databaseUrl.password ||
    !databaseUrl.pathname.slice(1)
  ) {
    throw new Error("La conexión local de Supabase está incompleta.");
  }

  console.log(
    `[E2E Setup] PostgreSQL local verificado en ${databaseUrl.hostname}:${databaseUrl.port}.`
  );

  const environment = {
    ...process.env,
    PGHOST: databaseUrl.hostname,
    PGPORT: databaseUrl.port,
    PGUSER: decodeURIComponent(databaseUrl.username),
    PGPASSWORD: decodeURIComponent(databaseUrl.password),
    PGDATABASE: decodeURIComponent(databaseUrl.pathname.slice(1)),
    PGCONNECT_TIMEOUT: "5",
    PGSSLMODE: "disable",
  };

  delete environment.PGHOSTADDR;
  delete environment.PGSERVICE;
  delete environment.PGSERVICEFILE;

  return environment;
}

console.log("[E2E Setup] Aplicando migraciones de Supabase Storage...");
try {
  const postgresEnvironment = getLocalDatabaseEnvironment();

  for (const migration of [projectStorageMigration, eventStorageMigration]) {
    console.log(`[E2E Setup] Aplicando ${path.basename(migration)}...`);
    execFileSync(
      "psql",
      ["-X", "--no-password", "--set=ON_ERROR_STOP=1", "--single-transaction", "--file", migration],
      {
        env: postgresEnvironment,
        stdio: "inherit",
      }
    );
  }

  console.log("[E2E Setup] Buckets y políticas de Storage aplicados correctamente.");
} catch (error) {
  console.error("[E2E Setup] Error al aplicar migraciones de Storage:", error.message);
  process.exit(1);
}
