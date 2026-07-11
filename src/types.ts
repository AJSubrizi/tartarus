/**
 * Tartarus is NOT the orchestrator.
 * The orchestrator is always the main harness (Claude / Codex / Cursor / …)
 * calling these primitives over MCP.
 */

export type HarnessId =
  | "claude"
  | "codex"
  | "cursor"
  | "opencode"
  | "gemini"
  | "grok"
  | "glm"
  | "custom";

export type HarnessStatus = "unknown" | "ready" | "missing" | "busy" | "error";

export type JobStatus =
  | "queued"
  | "running"
  | "done"
  | "failed"
  | "killed"
  | "timed_out";

export interface Harness {
  id: string;
  kind: HarnessId;
  label: string;
  command: string;
  args: string[];
  status: HarnessStatus;
  lastError?: string;
  lastSeenAt?: number;
  model?: string;
  /** Absolute path after probe */
  resolvedPath?: string;
  /** First line of --version */
  version?: string;
}

export interface Job {
  id: string;
  harnessId: string;
  prompt: string;
  cwd?: string;
  worktree?: string;
  branch?: string;
  /** Optional tag from the calling agent (e.g. "arena-heat-1") */
  tag?: string;
  status: JobStatus;
  pid?: number;
  exitCode?: number | null;
  startedAt: number;
  finishedAt?: number;
  timeoutMs?: number;
  logTail: string;
  error?: string;
  /** Exact argv used to spawn */
  commandLine?: string;
  resolvedCommand?: string;
  adapterSummary?: string;
  promptFile?: string;
}

export interface TartarusState {
  version: 3;
  harnesses: Harness[];
  jobs: Job[];
  projectRoot?: string;
  /** Env files to copy into new worktrees */
  envCopy: string[];
  defaultTimeoutMs: number;
}
