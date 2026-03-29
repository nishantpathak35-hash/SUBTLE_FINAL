import { spawnSync } from "node:child_process";

const schema = process.env.PRISMA_SCHEMA || "prisma/schema.prisma";
const prismaBin =
  process.platform === "win32" ? "node_modules\\.bin\\prisma.cmd" : "node_modules/.bin/prisma";

const args = process.argv.slice(2);
const finalArgs = [...args, "--schema", schema];

if (!process.env.DATABASE_URL && schema.replaceAll("\\", "/").endsWith("prisma/schema.prisma")) {
  process.env.DATABASE_URL = "file:./prisma/dev.db";
}

const result = spawnSync(prismaBin, finalArgs, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

process.exit(result.status ?? 1);
