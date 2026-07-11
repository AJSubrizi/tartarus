import { chmodSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "dist", "cli.js");

if (!existsSync(cli)) {
  console.error("postbuild: dist/cli.js missing");
  process.exit(1);
}

let src = readFileSync(cli, "utf8");
if (!src.startsWith("#!")) {
  src = "#!/usr/bin/env node\n" + src;
  writeFileSync(cli, src);
}
chmodSync(cli, 0o755);
console.log("postbuild: dist/cli.js executable");
