import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import type { Harness, HarnessId } from "./types.js";
import {
  ADAPTERS,
  buildHarnessRun,
  probeVersion,
  resolveBinary,
  type BuiltRun,
} from "./adapters.js";

export const DEFAULT_HARNESSES: Harness[] = (
  Object.keys(ADAPTERS) as HarnessId[]
)
  .filter((k) => k !== "custom")
  .map((kind) => ({
    id: kind,
    kind,
    label: ADAPTERS[kind].label,
    command: ADAPTERS[kind].binaries[0] ?? kind,
    args: [] as string[],
    status: "unknown" as const,
  }));

export function which(bin: string): string | null {
  if (bin.includes("/") || bin.includes("\\")) return bin;
  const w = spawnSync(process.platform === "win32" ? "where" : "which", [bin], {
    encoding: "utf8",
  });
  if (w.status !== 0) return null;
  return (w.stdout || "").trim().split("\n")[0] || null;
}

export function probeHarness(h: Harness): Harness {
  const resolved = resolveBinary(h.kind, h.command);
  if ("error" in resolved) {
    return {
      ...h,
      status: "missing",
      lastError: resolved.error,
      lastSeenAt: Date.now(),
      resolvedPath: undefined,
      version: undefined,
    };
  }

  const version = probeVersion(
    resolved.command,
    ADAPTERS[h.kind]?.versionArgs ?? ["--version"],
  );

  if (h.status === "busy") {
    return {
      ...h,
      command: resolved.command,
      resolvedPath: resolved.path,
      version,
      lastSeenAt: Date.now(),
      lastError: undefined,
    };
  }

  return {
    ...h,
    command: resolved.command,
    resolvedPath: resolved.path,
    version,
    status: "ready",
    lastError: undefined,
    lastSeenAt: Date.now(),
  };
}

export function probeAll(harnesses: Harness[]): Harness[] {
  return harnesses.map(probeHarness);
}

export function buildRun(
  kind: HarnessId,
  opts: {
    prompt: string;
    cwd: string;
    baseArgs: string[];
    model?: string;
    safer?: boolean;
  },
): BuiltRun {
  return buildHarnessRun(kind, {
    prompt: opts.prompt,
    cwd: opts.cwd,
    baseArgs: opts.baseArgs,
    model: opts.model,
    safer: opts.safer,
  });
}

export interface RunHandle {
  pid: number;
  child: ChildProcess;
  kill: (signal?: NodeJS.Signals) => void;
}

export function spawnHarness(opts: {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  onData: (chunk: string) => void;
  onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
}): RunHandle {
  const child = spawn(opts.command, opts.args, {
    cwd: opts.cwd,
    env: {
      ...process.env,
      TARTARUS: "1",
      CI: "1",
      NO_COLOR: process.env.NO_COLOR ?? "1",
      FORCE_COLOR: "0",
      ...opts.env,
    },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });

  const push = (buf: Buffer) => opts.onData(buf.toString("utf8"));
  child.stdout?.on("data", push);
  child.stderr?.on("data", push);
  child.on("exit", (code, signal) => opts.onExit(code, signal));
  child.on("error", (err) => {
    opts.onData(`\n[tartarus] spawn error: ${err.message}\n`);
    opts.onExit(1, null);
  });

  const kill = (signal: NodeJS.Signals = "SIGTERM") => {
    try {
      if (process.platform !== "win32" && child.pid) {
        process.kill(-child.pid, signal);
      } else {
        child.kill(signal);
      }
    } catch {
      try {
        child.kill(signal);
      } catch {
        /* dead */
      }
    }
  };

  return { pid: child.pid ?? -1, child, kill };
}

function shellQuote(s: string): string {
  if (/^[a-zA-Z0-9_./:@%+=,-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export function formatCommandLine(command: string, args: string[]): string {
  return [command, ...args.map(shellQuote)].join(" ");
}
