import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { store, statePath } from "./state.js";
import { listAdapters, listWorktrees, refreshHarnesses } from "./runtime.js";
import { logDir } from "./logs.js";

export const VERSION = "0.4.0";

export function doctorReport(repoRoot?: string) {
  const root = repoRoot ?? process.cwd();
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  const harnesses = refreshHarnesses();
  const adapters = listAdapters();
  const ready = harnesses.filter((h) => h.status === "ready");
  const missing = harnesses.filter((h) => h.status === "missing");

  const git = spawnSync("git", ["--version"], { encoding: "utf8" });
  const distCli = join(root, "dist", "cli.js");

  const checks: Array<{ name: string; ok: boolean; detail: string }> = [
    {
      name: "node",
      ok: nodeMajor >= 20,
      detail: `v${process.versions.node}${nodeMajor >= 20 ? "" : " (need >= 20)"}`,
    },
    {
      name: "git",
      ok: git.status === 0,
      detail: (git.stdout || git.stderr || "git missing").trim(),
    },
    {
      name: "state",
      ok: true,
      detail: statePath(),
    },
    {
      name: "logs",
      ok: true,
      detail: logDir(),
    },
    {
      name: "projectRoot",
      ok: Boolean(store.state.projectRoot && existsSync(store.state.projectRoot)),
      detail: store.state.projectRoot ?? "(unset — tartarus_set_project)",
    },
    {
      name: "harnesses_ready",
      ok: ready.length > 0,
      detail: `${ready.length} ready · ${missing.length} missing`,
    },
    {
      name: "build",
      ok: existsSync(distCli),
      detail: existsSync(distCli) ? distCli : "run pnpm build",
    },
  ];

  // Harnesses may be missing on CI / fresh machines — not a hard fail
  const hard = checks.filter(
    (c) => !["projectRoot", "harnesses_ready"].includes(c.name),
  );

  return {
    ok: hard.every((c) => c.ok),
    version: VERSION,
    role: "You orchestrate. Tartarus only runs primitives.",
    checks,
    ready: ready.map((h) => ({
      id: h.id,
      command: h.command,
      version: h.version,
    })),
    missing: missing.map((h) => ({
      id: h.id,
      command: h.command,
      error: h.lastError,
    })),
    adapters: adapters.filter((a) => a.resolved).map((a) => a.kind),
    worktrees: listWorktrees(),
    mcp: {
      command: "node",
      args: [
        existsSync(distCli) ? distCli : join(root, "src", "cli.ts"),
        "mcp",
      ],
    },
  };
}

export function mcpConfigJson(cliPath: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        tartarus: {
          command: "node",
          args: [cliPath, "mcp"],
        },
      },
    },
    null,
    2,
  );
}
