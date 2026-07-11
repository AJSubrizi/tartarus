/**
 * One-shot MCP registration — same UX as other MCP packages.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
/** Portable install — works on any machine with network (like other MCPs) */
export const NPX_PACKAGE = "github:AJSubrizi/tartarus";
export function mcpLaunchNpx() {
    return {
        command: "npx",
        args: ["-y", NPX_PACKAGE, "mcp"],
    };
}
/** Local dist (dev / ./install.sh) */
export function mcpLaunchLocal(repoRoot = ROOT) {
    const dist = join(repoRoot, "dist", "cli.js");
    if (!existsSync(dist))
        return null;
    return { command: "node", args: [dist, "mcp"] };
}
export function mcpConfigObject(mode = "npx", repoRoot = ROOT) {
    const launch = mode === "local" ? mcpLaunchLocal(repoRoot) ?? mcpLaunchNpx() : mcpLaunchNpx();
    return {
        mcpServers: {
            tartarus: {
                command: launch.command,
                args: launch.args,
            },
        },
    };
}
export function mcpConfigJson(mode = "npx", repoRoot = ROOT) {
    return JSON.stringify(mcpConfigObject(mode, repoRoot), null, 2);
}
export function codexAddCommand(mode = "npx") {
    const { command, args } = mcpConfigObject(mode).mcpServers.tartarus;
    // codex mcp add NAME -- COMMAND ARGS...
    return ["codex", "mcp", "add", "tartarus", "--", command, ...args]
        .map(shellQuote)
        .join(" ");
}
function shellQuote(s) {
    if (/^[a-zA-Z0-9_./:@%+=,-]+$/.test(s))
        return s;
    return `'${s.replace(/'/g, `'\\''`)}'`;
}
export function setupCodex(opts) {
    const mode = opts?.mode ?? "npx";
    const { command, args } = mcpConfigObject(mode).mcpServers.tartarus;
    const full = ["mcp", "add", "tartarus", "--", command, ...args];
    const display = codexAddCommand(mode);
    if (opts?.dryRun) {
        return { ok: true, command: display, stdout: "", stderr: "" };
    }
    // remove old registration if present (ignore errors)
    spawnSync("codex", ["mcp", "remove", "tartarus"], { encoding: "utf8" });
    const r = spawnSync("codex", full, { encoding: "utf8" });
    return {
        ok: r.status === 0,
        command: display,
        stdout: (r.stdout ?? "").trim(),
        stderr: (r.stderr ?? "").trim(),
    };
}
export function printSetupGuide() {
    const npx = mcpConfigJson("npx");
    const local = mcpConfigJson("local");
    return `Tartarus MCP setup (like any other MCP)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Codex (one line)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  codex mcp add tartarus -- npx -y ${NPX_PACKAGE} mcp

  # or auto:
  tartarus setup codex

  codex mcp list          # should show tartarus enabled
  codex                   # restart session, then: "use tartarus_help"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Claude Code / Cursor / generic JSON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${npx}

Local checkout (no network for MCP start):

${local}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verify
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  tartarus doctor
  # In Codex: "Call tartarus_refresh and list ready harnesses"
`;
}
