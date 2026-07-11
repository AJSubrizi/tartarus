/**
 * prepare hook: ensure dist/ exists when installing from git/npx.
 */
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "dist", "cli.js");

if (existsSync(cli)) {
  process.exit(0);
}

// Prefer shipping dist in the repo; if missing, try build
const tsc = join(root, "node_modules", "typescript", "bin", "tsc");
if (!existsSync(tsc) && !existsSync(join(root, "node_modules", ".bin", "tsc"))) {
  console.warn(
    "[tartarus] dist/ missing and typescript not installed — run: npm run build",
  );
  process.exit(0);
}

console.log("[tartarus] building dist…");
const r = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "build"],
  { cwd: root, stdio: "inherit", shell: true },
);
process.exit(r.status ?? 1);
