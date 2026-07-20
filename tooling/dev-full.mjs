import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env")) {
  loadEnvFile(".env");
}

const env = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://nortix:nortix@localhost:5432/nortix?schema=public",
};

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
