/**
 * Context pack → brief markdown for worker harnesses.
 * Orchestrator owns decisions; we package context cleanly.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { ContextPack, Job, JobSummary, ProjectDna } from "./types.js";
import { inspectPath } from "./inspect.js";
import { store } from "./state.js";

export const DEFAULT_GUIDE_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  "ZERO.md",
  ".zero/AGENTS.md",
  "PRODUCT.md",
  "CONTRIBUTING.md",
  "README.md",
];

export interface BuiltContext {
  brief: string;
  briefPath?: string;
  goal: string;
  filesIncluded: string[];
  guidesFound: string[];
  handoffFrom?: string;
}

function readSafe(path: string, max = 12_000): string {
  try {
    const raw = readFileSync(path, "utf8");
    if (raw.length <= max) return raw;
    return raw.slice(0, max) + "\n\n…[truncated for brief]\n";
  } catch {
    return "";
  }
}

function resolveInRoot(root: string, p: string): string | null {
  const abs = isAbsolute(p) ? p : resolve(root, p);
  if (!existsSync(abs) || !statSync(abs).isFile()) return null;
  // stay inside root when relative
  if (!isAbsolute(p)) {
    const rel = relative(root, abs);
    if (rel.startsWith("..")) return null;
  }
  return abs;
}

/**
 * Copy non-gitignored context files into worktree if missing
 * (guides are usually already in git; this helps untracked notes).
 */
export function materializeContextFiles(
  root: string,
  worktree: string,
  files: string[],
): string[] {
  const copied: string[] = [];
  for (const f of files) {
    const src = resolveInRoot(root, f);
    if (!src) continue;
    const rel = isAbsolute(f) ? basename(f) : f;
    const dest = join(worktree, rel);
    if (existsSync(dest)) continue;
    try {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      copied.push(rel);
    } catch {
      /* ignore */
    }
  }
  return copied;
}

export function findProjectGuides(root: string, dna?: ProjectDna): string[] {
  const list = dna?.guideFiles?.length ? dna.guideFiles : DEFAULT_GUIDE_FILES;
  const found: string[] = [];
  for (const g of list) {
    if (resolveInRoot(root, g)) found.push(g);
  }
  // de-dupe, prefer AGENTS/CLAUDE first
  return [...new Set(found)];
}

export function buildHandoffSummary(job: Job): JobSummary {
  const goal = job.prompt;
  const logExcerpt = (job.logTail ?? "").slice(-4000);
  let filesChanged: number | undefined;
  let additions: number | undefined;
  let deletions: number | undefined;
  const path = job.worktree ?? job.cwd;
  if (path && existsSync(path)) {
    try {
      const insp = inspectPath(path, { patchLimit: 2000 });
      filesChanged = insp.filesChanged;
      additions = insp.additions;
      deletions = insp.deletions;
    } catch {
      /* ignore */
    }
  }

  const lines = [
    `## Handoff from job \`${job.id}\``,
    "",
    `- **Harness:** ${job.harnessId}`,
    `- **Status:** ${job.status}${job.exitCode != null ? ` (exit ${job.exitCode})` : ""}`,
    `- **Goal:** ${goal}`,
  ];
  if (job.branch) lines.push(`- **Branch:** \`${job.branch}\``);
  if (job.worktree) lines.push(`- **Worktree:** \`${job.worktree}\``);
  if (filesChanged != null) {
    lines.push(
      `- **Diff:** ${filesChanged} files, +${additions ?? 0}/−${deletions ?? 0}`,
    );
  }
  lines.push("", "### Log excerpt", "```", logExcerpt || "(empty)", "```");
  lines.push(
    "",
    "### Instructions for next agent",
    "Continue from this state. Do not redo completed work. Fix only remaining gaps.",
  );

  return {
    jobId: job.id,
    harnessId: job.harnessId,
    status: job.status,
    goal,
    branch: job.branch,
    worktree: job.worktree,
    exitCode: job.exitCode,
    logExcerpt,
    filesChanged,
    additions,
    deletions,
    handoffMarkdown: lines.join("\n"),
  };
}

export function renderBrief(opts: {
  goal: string;
  root: string;
  worktree?: string;
  context?: ContextPack;
  harnessId: string;
  jobId: string;
  tag?: string;
}): BuiltContext {
  const ctx = opts.context ?? {};
  const goal = (ctx.goal ?? opts.goal).trim();
  const dna = store.state.dna;
  const cwd = opts.worktree ?? opts.root;

  const guides = ctx.skipProjectGuides
    ? []
    : findProjectGuides(opts.root, dna);

  const files = [...(ctx.files ?? [])];
  const filesResolved = files
    .map((f) => ({ f, abs: resolveInRoot(opts.root, f) }))
    .filter((x) => x.abs);

  let handoffMd = "";
  if (ctx.handoffFromJobId) {
    const prev = store.getJob(ctx.handoffFromJobId);
    if (prev) {
      const sum = prev.summary ?? buildHandoffSummary(prev);
      handoffMd = sum.handoffMarkdown;
    }
  }

  const parts: string[] = [
    `# Tartarus task brief`,
    ``,
    `You are a coding agent worker. Complete the goal. Prefer small, correct diffs.`,
    ``,
    `- **Job:** \`${opts.jobId}\``,
    `- **Harness:** \`${opts.harnessId}\``,
    opts.tag ? `- **Tag:** \`${opts.tag}\`` : null,
    `- **Workspace:** \`${cwd}\``,
    ``,
    `## Goal`,
    ``,
    goal,
  ].filter((x): x is string => x != null);

  if (ctx.constraints?.length) {
    parts.push(``, `## Constraints`, ``);
    for (const c of ctx.constraints) parts.push(`- ${c}`);
  }

  if (ctx.notes?.length) {
    parts.push(``, `## Notes / decisions`, ``);
    for (const n of ctx.notes) parts.push(`- ${n}`);
  }

  if (guides.length) {
    parts.push(
      ``,
      `## Project guides (read if relevant)`,
      ``,
      `These files exist in the workspace:`,
    );
    for (const g of guides) parts.push(`- \`${g}\``);
  }

  if (filesResolved.length) {
    parts.push(``, `## Priority files`, ``);
    for (const { f, abs } of filesResolved) {
      parts.push(`### \`${f}\``, ``, "```", readSafe(abs!), "```", ``);
    }
  }

  if (handoffMd) {
    parts.push(``, handoffMd, ``);
  }

  if (ctx.extraMarkdown?.trim()) {
    parts.push(``, `## Extra context`, ``, ctx.extraMarkdown.trim(), ``);
  }

  parts.push(
    ``,
    `## Done criteria`,
    ``,
    `- Implement the goal without violating constraints`,
    `- Keep changes focused`,
    `- Prefer running available tests/linters when relevant`,
    ``,
  );

  return {
    brief: parts.join("\n"),
    goal,
    filesIncluded: filesResolved.map((x) => x.f),
    guidesFound: guides,
    handoffFrom: ctx.handoffFromJobId,
  };
}

/** Write brief into worktree (or tmp) and return path + text */
export function writeBriefFile(
  brief: string,
  cwd: string,
  jobId: string,
): string {
  const dir = join(cwd, ".tartarus");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `brief-${jobId}.md`);
  writeFileSync(path, brief, "utf8");
  return path;
}

/**
 * Final prompt string for adapters: prefer pointing at brief file in workspace
 * so ARG_MAX and sandbox both work.
 */
export function promptForAdapter(briefPath: string, goal: string): string {
  return [
    `Execute the Tartarus task brief fully.`,
    `Brief file (in workspace): ${briefPath}`,
    ``,
    `Goal summary: ${goal.slice(0, 500)}`,
    ``,
    `Read the brief file first, follow all constraints, then implement.`,
  ].join("\n");
}

export function mergeContext(
  prompt: string,
  context?: ContextPack,
): { goal: string; context: ContextPack } {
  const goal = (context?.goal ?? prompt).trim();
  return {
    goal,
    context: {
      ...context,
      goal,
    },
  };
}
