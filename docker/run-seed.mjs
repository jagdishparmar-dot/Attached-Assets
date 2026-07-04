import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "../load-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "scripts/package.json"));
const tsxBin = require.resolve("tsx/dist/cli.mjs");

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
