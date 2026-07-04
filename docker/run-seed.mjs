import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "../load-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsxBin = path.join(root, "scripts/node_modules/tsx/dist/cli.mjs");

if (!fs.existsSync(tsxBin)) {
  console.error(`tsx binary not found at ${tsxBin}`);
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ["--import", path.join(root, "load-env.mjs"), tsxBin, "./scripts/src/seed-staff.ts"],
  {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  },
);

process.exit(result.status === null ? 1 : result.status);
