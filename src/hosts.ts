/**
 * Install Tartarus MCP into host apps (Claude Code, Codex, Cursor).
 * One-click from the GUI.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { mcpConfigObject, mcpLaunchLocal, mcpLaunchNpx, NPX_PACKAGE } from "./setup.js";

export type HostId = "claude" | "codex" | "cursor";

export interface HostInfo {
  id: HostId;
  label: string;
  description: string;
  /** CLI on PATH or app present */
  installed: boolean;
  /** Tartarus MCP already registered */
  mcpInstalled: boolean;
  detail?: string;
  installHint?: string;
}

function which(bin: string): string | null {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [bin], {
    encoding: "utf8",
  });
  if (r.status !== 0) return null;
  return (r.stdout || "").trim().split("\n")[0] || null;
}

function launch(preferLocal: boolean) {
  if (preferLocal) {
    return mcpLaunchLocal() ?? mcpLaunchNpx();
  }
  return mcpLaunchNpx();
}

// ── Claude Code ────────────────────────────────────────────

function claudeMcpList(): string {
  const r = spawnSync("claude", ["mcp", "list"], { encoding: "utf8" });
  return `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
}

function isClaudeMcpInstalled(): boolean {
  if (!which("claude")) return false;
  const out = claudeMcpList().toLowerCase();
  return /\btartarus\b/.test(out);
}

function installClaude(preferLocal: boolean): { ok: boolean; message: string } {
  if (!which("claude")) {
    return { ok: false, message: "Claude Code CLI not found on PATH" };
  }
  spawnSync("claude", ["mcp", "remove", "tartarus", "-s", "user"], {
    encoding: "utf8",
  });
  const { command, args } = launch(preferLocal);
  // claude mcp add name -- command args...
  const r = spawnSync(
    "claude",
    ["mcp", "add", "tartarus", "-s", "user", "--", command, ...args],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    return {
      ok: false,
      message: (r.stderr || r.stdout || "claude mcp add failed").trim(),
    };
  }
  return {
    ok: true,
    message: "Installed on Claude Code (user scope). Restart Claude Code.",
  };
}

function uninstallClaude(): { ok: boolean; message: string } {
  if (!which("claude")) {
    return { ok: false, message: "Claude Code CLI not found" };
  }
  const r = spawnSync("claude", ["mcp", "remove", "tartarus", "-s", "user"], {
    encoding: "utf8",
  });
  return {
    ok: r.status === 0,
    message:
      r.status === 0
        ? "Removed from Claude Code"
        : (r.stderr || r.stdout || "remove failed").trim(),
  };
}

// ── Codex ──────────────────────────────────────────────────

function isCodexMcpInstalled(): boolean {
  if (!which("codex")) return false;
  const r = spawnSync("codex", ["mcp", "list"], { encoding: "utf8" });
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`.toLowerCase();
  return /\btartarus\b/.test(out) && !/\btartarus\b.*disabled/.test(out);
}

function installCodex(preferLocal: boolean): { ok: boolean; message: string } {
  if (!which("codex")) {
    return { ok: false, message: "Codex CLI not found on PATH" };
  }
  spawnSync("codex", ["mcp", "remove", "tartarus"], { encoding: "utf8" });
  const { command, args } = launch(preferLocal);
  const r = spawnSync(
    "codex",
    ["mcp", "add", "tartarus", "--", command, ...args],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    return {
      ok: false,
      message: (r.stderr || r.stdout || "codex mcp add failed").trim(),
    };
  }
  return {
    ok: true,
    message: "Installed on Codex. Restart Codex, then: use tartarus_help",
  };
}

function uninstallCodex(): { ok: boolean; message: string } {
  if (!which("codex")) {
    return { ok: false, message: "Codex CLI not found" };
  }
  const r = spawnSync("codex", ["mcp", "remove", "tartarus"], {
    encoding: "utf8",
  });
  return {
    ok: r.status === 0,
    message:
      r.status === 0
        ? "Removed from Codex"
        : (r.stderr || r.stdout || "remove failed").trim(),
  };
}

// ── Cursor ─────────────────────────────────────────────────

function cursorMcpPath(): string {
  return join(homedir(), ".cursor", "mcp.json");
}

function readCursorMcp(): { mcpServers?: Record<string, unknown> } {
  const p = cursorMcpPath();
  if (!existsSync(p)) return { mcpServers: {} };
  try {
    return JSON.parse(readFileSync(p, "utf8")) as {
      mcpServers?: Record<string, unknown>;
    };
  } catch {
    return { mcpServers: {} };
  }
}

function isCursorMcpInstalled(): boolean {
  const cfg = readCursorMcp();
  return Boolean(cfg.mcpServers?.tartarus);
}

function installCursor(preferLocal: boolean): { ok: boolean; message: string } {
  const p = cursorMcpPath();
  mkdirSync(dirname(p), { recursive: true });
  if (existsSync(p)) {
    try {
      copyFileSync(p, `${p}.bak`);
    } catch {
      /* ignore */
    }
  }
  const cfg = readCursorMcp();
  const servers = { ...(cfg.mcpServers ?? {}) };
  const { command, args } = launch(preferLocal);
  servers.tartarus = { command, args };
  writeFileSync(
    p,
    JSON.stringify({ ...cfg, mcpServers: servers }, null, 2) + "\n",
    "utf8",
  );
  return {
    ok: true,
    message: `Wrote ${p}. Restart Cursor / reload MCP.`,
  };
}

function uninstallCursor(): { ok: boolean; message: string } {
  const p = cursorMcpPath();
  if (!existsSync(p)) {
    return { ok: true, message: "No Cursor mcp.json found" };
  }
  const cfg = readCursorMcp();
  const servers = { ...(cfg.mcpServers ?? {}) };
  delete servers.tartarus;
  writeFileSync(
    p,
    JSON.stringify({ ...cfg, mcpServers: servers }, null, 2) + "\n",
    "utf8",
  );
  return { ok: true, message: "Removed tartarus from Cursor mcp.json" };
}

// ── Public API ─────────────────────────────────────────────

export function listHosts(): HostInfo[] {
  const claudeBin = which("claude");
  const codexBin = which("codex");
  const cursorBin = which("cursor-agent") || which("cursor");

  return [
    {
      id: "claude",
      label: "Claude Code",
      description: "Orchestrate from Claude — install Tartarus as MCP",
      installed: Boolean(claudeBin),
      mcpInstalled: isClaudeMcpInstalled(),
      detail: claudeBin ?? "not on PATH",
      installHint: claudeBin
        ? undefined
        : "Install Claude Code CLI and run `claude auth login`",
    },
    {
      id: "codex",
      label: "Codex",
      description: "Orchestrate from Codex — install Tartarus as MCP",
      installed: Boolean(codexBin),
      mcpInstalled: isCodexMcpInstalled(),
      detail: codexBin ?? "not on PATH",
      installHint: codexBin
        ? undefined
        : "Install Codex CLI and sign in",
    },
    {
      id: "cursor",
      label: "Cursor",
      description: "Orchestrate from Cursor Agent — write ~/.cursor/mcp.json",
      installed: Boolean(cursorBin) || existsSync(join(homedir(), ".cursor")),
      mcpInstalled: isCursorMcpInstalled(),
      detail: cursorBin ?? (existsSync(join(homedir(), ".cursor"))
        ? "~/.cursor"
        : "not found"),
      installHint:
        cursorBin || existsSync(join(homedir(), ".cursor"))
          ? undefined
          : "Install Cursor desktop app",
    },
  ];
}

export function installHostMcp(
  host: HostId,
  opts?: { preferLocal?: boolean },
): { ok: boolean; message: string; host: HostId } {
  const preferLocal = opts?.preferLocal ?? false;
  let result: { ok: boolean; message: string };
  switch (host) {
    case "claude":
      result = installClaude(preferLocal);
      break;
    case "codex":
      result = installCodex(preferLocal);
      break;
    case "cursor":
      result = installCursor(preferLocal);
      break;
    default:
      result = { ok: false, message: `unknown host: ${host}` };
  }
  return { ...result, host };
}

export function uninstallHostMcp(
  host: HostId,
): { ok: boolean; message: string; host: HostId } {
  let result: { ok: boolean; message: string };
  switch (host) {
    case "claude":
      result = uninstallClaude();
      break;
    case "codex":
      result = uninstallCodex();
      break;
    case "cursor":
      result = uninstallCursor();
      break;
    default:
      result = { ok: false, message: `unknown host: ${host}` };
  }
  return { ...result, host };
}

export function dashboardState() {
  return {
    hosts: listHosts(),
    mcpSnippet: JSON.stringify(mcpConfigObject("npx"), null, 2),
    npxPackage: NPX_PACKAGE,
  };
}
