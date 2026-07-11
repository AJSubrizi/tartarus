#!/usr/bin/env node
/**
 * Fake harness for smoke tests — no LLM, no API.
 * Cross-platform (macOS / Linux / Windows).
 */
import { writeFileSync } from "node:fs";

const prompt = process.argv.slice(2).join(" ");
console.log(`[smoke-worker] cwd=${process.cwd()}`);
console.log(`[smoke-worker] prompt=${prompt.slice(0, 200)}`);

writeFileSync(
  ".tartarus-smoke-ok",
  `ok ${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}\n`,
);
console.log("[smoke-worker] wrote .tartarus-smoke-ok");
console.log("[smoke-worker] done");
process.exit(0);
