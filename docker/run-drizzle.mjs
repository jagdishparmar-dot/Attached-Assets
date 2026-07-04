import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "../load-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const drizzleBin = path.join(root, "lib/db/node_modules/drizzle-kit/bin.cjs");

if (!fs.existsSync(drizzleBin)) {
  console.error(`drizzle-kit binary not found at ${drizzleBin}`);
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ["--import", path.join(root, "load-env.mjs"), drizzleBin, "push", "--config", "./drizzle.config.ts"],
  {
    cwd: path.join(root, "lib/db"),
    stdio: "inherit",
    env: process.env,
  },
);

process.exit(result.status === null ? 1 : result.status);
