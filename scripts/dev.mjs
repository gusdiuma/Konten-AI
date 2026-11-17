import { spawn } from "node:child_process";
import path from "node:path";

const rawArgs = process.argv.slice(2);
const translatedArgs = [];

let hasPort = false;
let hasHostname = false;

for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];

  if (arg === "--host") {
    hasHostname = true;
    const next = rawArgs[i + 1];
    if (next && !next.startsWith("-")) {
      translatedArgs.push("--hostname", next);
      i += 1;
    } else {
      translatedArgs.push("--hostname", "0.0.0.0");
    }
    continue;
  }

  if (arg.startsWith("--host=")) {
    hasHostname = true;
    translatedArgs.push("--hostname", arg.slice("--host=".length) || "0.0.0.0");
    continue;
  }

  if (arg === "-H" || arg === "--hostname" || arg.startsWith("--hostname=")) {
    hasHostname = true;
  }

  if (arg === "-p" || arg === "--port" || arg.startsWith("--port=")) {
    hasPort = true;
  }

  translatedArgs.push(arg);
}

if (!hasPort) {
  translatedArgs.push("-p", process.env.PORT || "3000");
}

if (!hasHostname) {
  translatedArgs.push("-H", "0.0.0.0");
}

const nextBin = path.resolve(process.cwd(), "node_modules", ".bin", "next");

const child = spawn(nextBin, ["dev", ...translatedArgs], {
  stdio: "inherit",
  env: process.env,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
