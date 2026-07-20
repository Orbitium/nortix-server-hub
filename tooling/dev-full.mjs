import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env")) {
  loadEnvFile(".env");
}

const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? "development",
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://nortix:nortix@localhost:5432/nortix?schema=public",
  POSTGRES_USER: process.env.POSTGRES_USER ?? "nortix",
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? "nortix",
  POSTGRES_DB: process.env.POSTGRES_DB ?? "nortix",
};

function run(command, { quiet = false } = {}) {
  return spawnSync(command, {
    cwd: process.cwd(),
    env,
    shell: true,
    stdio: quiet ? "ignore" : "inherit",
  });
}

function commandAvailable(command) {
  const probe = process.platform === "win32" ? `where ${command}` : `command -v ${command}`;
  return run(probe, { quiet: true }).status === 0;
}

function failDatabaseSetup() {
  console.error(`
[dev:full] Nortix could not connect to its local PostgreSQL database.

Install and start Docker Desktop, then run npm run dev:full again. The command
will start the repository's PostgreSQL service, apply migrations, and seed an
empty development database automatically.

Alternatively, set DATABASE_URL to an existing PostgreSQL database before
running npm run dev:full.
`);
  process.exit(1);
}

const usesDefaultDatabase = !process.env.DATABASE_URL;
if (usesDefaultDatabase && commandAvailable("docker")) {
  console.info("[dev:full] Starting local PostgreSQL…");
  const postgres = run("docker compose up -d --wait postgres");
  if (postgres.status !== 0) failDatabaseSetup();
}

console.info("[dev:full] Applying database migrations…");
const migration = run("pnpm --filter @nortix/database exec prisma migrate deploy");
if (migration.status !== 0) failDatabaseSetup();

const dataCheck = run("pnpm --filter @nortix/database exec tsx prisma/check-dev-data.ts");
if (dataCheck.status === 10) {
  console.info("[dev:full] Loading development seed data…");
  const seed = run("pnpm db:seed");
  if (seed.status !== 0) {
    console.error("[dev:full] Seed data could not be loaded.");
    process.exit(1);
  }
} else if (dataCheck.status !== 0) {
  failDatabaseSetup();
}

const apiOnly = process.argv.includes("--api-only");
const commands = apiOnly
  ? [["API", "npm --prefix apps/api run dev"]]
  : [
      ["API", "npm --prefix apps/api run dev"],
      ["Web", "npm --prefix apps/web run dev"],
    ];

const children = commands.map(([name, command]) => {
  const child = spawn(command, {
    cwd: process.cwd(),
    env,
    shell: true,
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error(`[dev:full] ${name} failed to start:`, error);
  });

  return { name, child };
});

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const { child } of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
    }
  }

  process.exitCode = exitCode;
}

for (const { name, child } of children) {
  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `exit code ${code ?? 1}`;
    console.error(`[dev:full] ${name} stopped with ${reason}; stopping the other service.`);
    shutdown(code ?? 1);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
