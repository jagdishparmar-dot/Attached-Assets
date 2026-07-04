import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "../load-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "lib/db/package.json"));
const drizzleBin = require.resolve("drizzle-kit/bin.cjs");

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
