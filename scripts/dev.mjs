import { spawn } from "node:child_process";

const admin = spawn(process.execPath, ["scripts/admin-api.mjs"], { stdio: "inherit", env: process.env });
const site = spawn("npm", ["run", "dev:site"], { stdio: "inherit", env: process.env });
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  admin.kill("SIGTERM");
  site.kill("SIGTERM");
  setTimeout(() => process.exit(code), 250);
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
admin.on("exit", code => { if (!stopping && code) stop(code); });
site.on("exit", code => { if (!stopping) stop(code || 0); });
