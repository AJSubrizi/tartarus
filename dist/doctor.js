import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { store, statePath } from "./state.js";
import { listAdapters, listWorktrees, refreshHarnesses } from "./runtime.js";
import { logDir } from "./logs.js";
import { NPX_PACKAGE, mcpConfigObject } from "./setup.js";
export const VERSION = "0.7.3";
export function doctorReport(repoRoot) {
    const root = repoRoot ?? process.cwd();
    const nodeMajor = Number(process.versions.node.split(".")[0]);
    const harnesses = refreshHarnesses();
    const adapters = listAdapters();
    const ready = harnesses.filter((h) => h.status === "ready");
    const missing = harnesses.filter((h) => h.status === "missing");
    const git = spawnSync("git", ["--version"], { encoding: "utf8" });
    const distCli = join(root, "dist", "cli.js");
    const codex = spawnSync("codex", ["--version"], { encoding: "utf8" });
    const checks = [
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
            detail: existsSync(distCli) ? distCli : "optional if using npx github install",
        },
        {
            name: "codex",
            ok: codex.status === 0,
            detail: codex.status === 0
                ? (codex.stdout || codex.stderr || "codex ok").trim().split("\n")[0]
                : "codex not on PATH (ok if you only use Claude/Cursor)",
        },
    ];
    const hard = checks.filter((c) => !["projectRoot", "harnesses_ready", "build", "codex"].includes(c.name));
    const npx = mcpConfigObject("npx");
    const local = mcpConfigObject("local", root);
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
            recommended: npx.mcpServers.tartarus,
            local: local.mcpServers.tartarus,
            codexOneLiner: `codex mcp add tartarus -- npx -y ${NPX_PACKAGE} mcp`,
        },
    };
}
/** @deprecated use setup.mcpConfigJson */
export function mcpConfigJson(cliPath) {
    return JSON.stringify({
        mcpServers: {
            tartarus: {
                command: "node",
                args: [cliPath, "mcp"],
            },
        },
    }, null, 2);
}
