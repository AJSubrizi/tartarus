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
import { VERSION, doctorReport } from "./doctor.js";
import {
  mcpConfigJson,
  printSetupGuide,
  setupCodex,
  codexAddCommand,
  NPX_PACKAGE,
} from "./setup.js";

const [, , cmd = "help", ...rest] = process.argv;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  switch (cmd) {
    case "serve":
    case "app":
    case "gui": {
      // Main product surface: connect subs → install MCP on hosts
      const noOpen = rest.includes("--no-open");
      const portArg = rest.find((a) => /^\d+$/.test(a));
      startHttpServer(Number(portArg ?? process.env.PORT ?? 7340), {
        open: !noOpen,
      });
      break;
    }
    case "mcp": {
      // Entry used by: npx -y @ajsubrizi/tartarus mcp
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
    case "setup": {
      // tartarus setup [codex|claude|cursor|all]
      const target = (rest[0] ?? "all").toLowerCase();
      if (target === "codex") {
        const mode = rest.includes("--local") ? "local" : "npx";
        if (rest.includes("--print") || rest.includes("--dry-run")) {
          console.log(codexAddCommand(mode));
          break;
        }
        console.log(`Registering Tartarus with Codex (${mode})…`);
        const result = setupCodex({ mode });
        console.log(result.command);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);
        if (!result.ok) {
          console.error("\nFailed. Is `codex` on PATH? Or run the command above manually.");
          process.exitCode = 1;
          break;
        }
        console.log("\n✓ Done. Restart Codex, then try: use tartarus_help");
        console.log("  codex mcp list");
        break;
      }
      console.log(printSetupGuide());
      break;
    }
    case "mcp-config": {
      // tartarus mcp-config [--local]
      const mode = rest.includes("--local") ? "local" : "npx";
      console.log(mcpConfigJson(mode, ROOT));
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
            mcp: `codex mcp add tartarus -- npx -y ${NPX_PACKAGE} mcp`,
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
  Tartarus                      = MCP primitives

Easiest:
  tartarus app                       Open GUI → connect subs → Install MCP

Or CLI one-liner (Codex):
  codex mcp add tartarus -- npx -y ${NPX_PACKAGE} mcp

Usage:
  tartarus app | serve [port]        GUI setup (opens browser)
  tartarus mcp                       MCP stdio server
  tartarus setup codex               Register MCP on Codex from CLI
  tartarus mcp-config [--local]      Print MCP JSON
  tartarus doctor
  tartarus status | refresh | adapters | preview
`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
