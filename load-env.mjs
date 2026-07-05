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

// Coolify / Prisma-style URLs may include ?schema=public — node-pg does not accept that param
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    if (url.searchParams.has("schema")) {
      url.searchParams.delete("schema");
      process.env.DATABASE_URL = url.toString();
    }
  } catch {
    // keep original value if parsing fails
  }
}

if (!process.env.PORT && process.env.API_PORT) {
  process.env.PORT = process.env.API_PORT;
}
