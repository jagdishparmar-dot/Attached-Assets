import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

function findEnvPath(startDir) {
  let dir = startDir;
  while (true) {
    const envPath = resolve(dir, ".env");
    if (existsSync(envPath)) return envPath;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const envPath = findEnvPath(dirname(fileURLToPath(import.meta.url)));
if (envPath) {
  config({ path: envPath });
}

if (!process.env.PORT && process.env.API_PORT) {
  process.env.PORT = process.env.API_PORT;
}
