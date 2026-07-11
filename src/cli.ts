#!/usr/bin/env node
/**
 * tartarus — harness for the harnesses
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { startHttpServer } from "./serve.js";
import { runMcpStdio } from "./mcp-server.js";
import { listAdapters, refreshHarnesses } from "./runtime.js";
import { store, statePath } from "./state.js";
import { buildRun, formatCommandLine } from "./harnesses.js";
import { VERSION, doctorReport, mcpConfigJson } from "./doctor.js";

const [, , cmd = "help", ...rest] = process.argv;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function cliPath(): string {
  const dist = join(ROOT, "dist", "cli.js");
  if (existsSync(dist)) return dist;
  return join(ROOT, "src", "cli.ts");
}

async function main() {
  switch (cmd) {
    case "serve": {
      startHttpServer(Number(rest[0] ?? process.env.PORT ?? 7340));
      break;
    }
    case "mcp": {
      await runMcpStdio();
      break;
    }
    case "version":
    case "-v":
    case "--version": {
      console.log(`tartarus ${VERSION}`);
      break;
    }
    case "doctor": {
      const report = doctorReport(ROOT);
      console.log(JSON.stringify(report, null, 2));
      if (!report.ok) process.exitCode = 1;
      break;
    }
    case "mcp-config": {
      const path = rest[0] ?? cliPath();
      console.log(mcpConfigJson(path));
      break;
    }
    case "status": {
      refreshHarnesses();
      console.log(
        JSON.stringify(
          {
            version: VERSION,
            role: "You orchestrate. Tartarus only runs primitives.",
            state: statePath(),
            projectRoot: store.state.projectRoot,
            harnesses: store.listHarnesses(),
            jobs: store.listJobs(10),
          },
          null,
          2,
        ),
      );
      break;
    }
    case "refresh": {
      console.log(JSON.stringify(refreshHarnesses(), null, 2));
      break;
    }
    case "adapters": {
      console.log(JSON.stringify(listAdapters(), null, 2));
      break;
    }
    case "preview": {
      const harnessId = rest[0];
      const prompt = rest.slice(1).join(" ") || "say hello";
      if (!harnessId) {
        console.error("usage: tartarus preview <harnessId> [prompt]");
        process.exit(1);
      }
      refreshHarnesses();
      const h = store.getHarness(harnessId);
      if (!h) {
        console.error(`unknown harness: ${harnessId}`);
        process.exit(1);
      }
      const cwd = store.state.projectRoot ?? process.cwd();
      const built = buildRun(h.kind, {
        prompt,
        cwd,
        baseArgs: h.args,
      });
      console.log(
        JSON.stringify(
          {
            command: h.command,
            commandLine: formatCommandLine(h.command, built.args),
            summary: built.summary,
            cwd,
          },
          null,
          2,
        ),
      );
      break;
    }
    case "help":
    case "--help":
    case "-h":
    default:
      if (cmd !== "help" && cmd !== "--help" && cmd !== "-h") {
        console.error(`unknown command: ${cmd}\n`);
      }
      console.log(`tartarus ${VERSION} — harness for the harnesses

  YOU (Claude / Codex / Cursor) = orchestrator
  Tartarus                      = reliable spawn primitives

Usage:
  tartarus serve [port]              Void UI (default :7340)
  tartarus mcp                       MCP stdio for your main agent
  tartarus doctor                    Health check
  tartarus mcp-config [cliPath]      Print MCP JSON
  tartarus status                    Harnesses + jobs
  tartarus refresh                   Re-probe PATH
  tartarus adapters                  Adapter versions + notes
  tartarus preview <id> [prompt]     Exact spawn argv (no process)
  tartarus version

Install:
  curl -fsSL …/install.sh | TARTARUS_REPO=owner/tartarus bash
  # or: ./install.sh && tartarus doctor
`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
