/**
 * Tartarus is NOT the orchestrator.
 * The orchestrator is always the main harness (Claude / Codex / Cursor / …)
 * calling these primitives over MCP.
 */
export type HarnessId = "claude" | "codex" | "cursor" | "opencode" | "gemini" | "grok" | "glm" | "pi" | "zero" | "custom";
export type HarnessStatus = "unknown" | "ready" | "missing" | "busy" | "error";
export type JobStatus = "queued" | "running" | "done" | "failed" | "killed" | "timed_out";
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
    resolvedPath?: string;
    version?: string;
}
/**
 * Structured context the orchestrator sends to workers.
 * Tartarus turns this into a single brief + worktree prep.
 */
export interface ContextPack {
    /** Primary task (required if no prompt string) */
    goal?: string;
    /** Hard constraints (do not / must) */
    constraints?: string[];
    /** Extra notes, decisions already made */
    notes?: string[];
    /** Relative paths the worker should read first */
    files?: string[];
    /** Prior job id — inject handoff summary */
    handoffFromJobId?: string;
    /** Free-form extra markdown appended to brief */
    extraMarkdown?: string;
    /** Skip auto-including AGENTS.md / CLAUDE.md pointers */
    skipProjectGuides?: boolean;
}
export interface JobSummary {
    jobId: string;
    harnessId: string;
    status: JobStatus;
    goal: string;
    branch?: string;
    worktree?: string;
    exitCode?: number | null;
    /** Truncated log tail useful for handoff */
    logExcerpt: string;
    /** Git-ish summary if available */
    filesChanged?: number;
    additions?: number;
    deletions?: number;
    /** One-paragraph handoff for next agent */
    handoffMarkdown: string;
}
export interface Job {
    id: string;
    harnessId: string;
    /** Original user prompt / goal */
    prompt: string;
    /** Full rendered brief actually sent to the CLI */
    renderedBrief?: string;
    context?: ContextPack;
    cwd?: string;
    worktree?: string;
    branch?: string;
    tag?: string;
    status: JobStatus;
    pid?: number;
    exitCode?: number | null;
    startedAt: number;
    finishedAt?: number;
    timeoutMs?: number;
    logTail: string;
    error?: string;
    commandLine?: string;
    resolvedCommand?: string;
    adapterSummary?: string;
    promptFile?: string;
    briefPath?: string;
    setupRan?: string[];
    summary?: JobSummary;
}
export interface ProjectDna {
    /** Shell commands after worktree create (e.g. pnpm install) */
    setup?: string[];
    /** Env filenames to copy */
    envCopy?: string[];
    /** Guide files to call out in brief (relative paths) */
    guideFiles?: string[];
    /** Base port for future multi-preview (reserved) */
    portsBase?: number;
    /** Auto-run setup on worktree create */
    autoSetup?: boolean;
}
export interface TartarusState {
    version: 4;
    harnesses: Harness[];
    jobs: Job[];
    projectRoot?: string;
    envCopy: string[];
    defaultTimeoutMs: number;
    dna: ProjectDna;
}
