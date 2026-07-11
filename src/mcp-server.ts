/**
 * Tartarus MCP — tools for the MAIN harness (the orchestrator).
 * Tartarus only runs primitives with solid CLI adapters.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { store } from "./state.js";
import {
  cleanupTag,
  connectHarness,
  createWorktree,
  disconnectHarness,
  fanout,
  getJobLog,
  inspectJobs,
  inspectPath,
  killByTag,
  killJob,
  listAdapters,
  listJobsFiltered,
  listWorktrees,
  refreshHarnesses,
  removeWorktree,
  runOnHarness,
  snapshot,
  waitForJob,
} from "./runtime.js";
import { buildRun, formatCommandLine } from "./harnesses.js";

function text(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "tartarus",
    version: "0.4.0",
  });

  server.tool(
    "tartarus_help",
    "Read first. YOU orchestrate; Tartarus only spawns/inspects.",
    {},
    async () =>
      text(`TARTARUS — harness for the harnesses

YOU = orchestrator (this agent session).
Tartarus = primitives: connect, worktree, run, fanout, inspect, kill, logs.

Typical flow:
1. tartarus_refresh / tartarus_adapters
2. tartarus_set_project
3. tartarus_fanout { prompt, harnessIds }
4. tartarus_wait or tartarus_job (poll)
5. tartarus_inspect_jobs { tag }  ← git facts to decide winner
6. YOU pick winner → tartarus_kill / tartarus_cleanup_tag on losers
7. ship from the winning worktree

Tartarus never auto-picks a winner.`),
  );

  server.tool(
    "tartarus_status",
    "Snapshot: harnesses, jobs, worktrees, adapters.",
    {},
    async () => text(snapshot()),
  );

  server.tool(
    "tartarus_adapters",
    "CLI adapters: binaries, path, version, headless notes.",
    {},
    async () => text({ adapters: listAdapters() }),
  );

  server.tool(
    "tartarus_refresh",
    "Probe PATH + versions.",
    {},
    async () => text({ harnesses: refreshHarnesses() }),
  );

  server.tool(
    "tartarus_list_harnesses",
    "List registered harnesses.",
    {},
    async () => text({ harnesses: store.listHarnesses() }),
  );

  server.tool(
    "tartarus_connect",
    "Register a harness CLI.",
    {
      id: z.string().optional(),
      kind: z.enum([
        "claude",
        "codex",
        "cursor",
        "opencode",
        "gemini",
        "grok",
        "custom",
      ]),
      command: z.string(),
      label: z.string().optional(),
      args: z.array(z.string()).optional(),
      model: z.string().optional(),
    },
    async (a) => text({ harness: connectHarness(a) }),
  );

  server.tool(
    "tartarus_disconnect",
    "Unregister a harness.",
    { id: z.string() },
    async ({ id }) => text({ removed: disconnectHarness(id) }),
  );

  server.tool(
    "tartarus_set_project",
    "Default repo root.",
    { path: z.string() },
    async ({ path }) => {
      store.setProjectRoot(path);
      return text({ projectRoot: path });
    },
  );

  server.tool(
    "tartarus_set_env_copy",
    "Env filenames copied into worktrees.",
    { files: z.array(z.string()) },
    async ({ files }) => {
      store.setEnvCopy(files);
      return text({ envCopy: files });
    },
  );

  server.tool(
    "tartarus_worktree_create",
    "Create isolated git worktree + env copy.",
    {
      branch: z.string(),
      repo: z.string().optional(),
    },
    async (a) => text(createWorktree(a)),
  );

  server.tool(
    "tartarus_worktree_remove",
    "Remove a worktree path.",
    {
      path: z.string(),
      force: z.boolean().optional(),
    },
    async (a) => text(removeWorktree(a)),
  );

  server.tool(
    "tartarus_worktree_list",
    "List Tartarus worktrees.",
    {},
    async () => text({ worktrees: listWorktrees() }),
  );

  server.tool(
    "tartarus_preview_run",
    "Dry-run exact spawn argv.",
    {
      harnessId: z.string(),
      prompt: z.string(),
      cwd: z.string().optional(),
      model: z.string().optional(),
      safer: z.boolean().optional(),
    },
    async (a) => {
      const h = store.getHarness(a.harnessId);
      if (!h) return text({ error: `unknown harness: ${a.harnessId}` });
      const cwd = a.cwd ?? store.state.projectRoot ?? process.cwd();
      const built = buildRun(h.kind, {
        prompt: a.prompt,
        cwd,
        baseArgs: h.args,
        model: a.model ?? h.model,
        safer: a.safer,
      });
      return text({
        command: h.command,
        args: built.args,
        commandLine: formatCommandLine(h.command, built.args),
        summary: built.summary,
        cwd,
        env: built.env,
      });
    },
  );

  server.tool(
    "tartarus_run",
    "Spawn ONE harness unattended. YOU orchestrate next steps.",
    {
      harnessId: z.string(),
      prompt: z.string(),
      cwd: z.string().optional(),
      worktreeBranch: z.string().optional(),
      tag: z.string().optional(),
      timeoutMs: z.number().optional(),
      model: z.string().optional(),
      safer: z.boolean().optional(),
    },
    async (a) => {
      try {
        return text({ job: runOnHarness(a) });
      } catch (e) {
        return text({ error: e instanceof Error ? e.message : String(e) });
      }
    },
  );

  server.tool(
    "tartarus_fanout",
    "Spawn same prompt on many harnesses. No auto-winner.",
    {
      prompt: z.string(),
      harnessIds: z.array(z.string()).min(1),
      useWorktrees: z.boolean().optional().default(true),
      tag: z.string().optional(),
      timeoutMs: z.number().optional(),
      model: z.string().optional(),
      safer: z.boolean().optional(),
    },
    async (a) => {
      try {
        const result = fanout(a);
        return text({
          ...result,
          message:
            "Fan-out started. Use tartarus_wait / tartarus_inspect_jobs. YOU pick the winner.",
        });
      } catch (e) {
        return text({ error: e instanceof Error ? e.message : String(e) });
      }
    },
  );

  server.tool(
    "tartarus_job",
    "Job status + in-memory log tail + commandLine.",
    { jobId: z.string() },
    async ({ jobId }) => {
      const job = store.getJob(jobId);
      return job ? text({ job }) : text({ error: "job not found" });
    },
  );

  server.tool(
    "tartarus_logs",
    "Full job log from disk (durable).",
    {
      jobId: z.string(),
      tail: z.number().optional().describe("Max chars from end (default 20000)"),
    },
    async ({ jobId, tail }) => text(getJobLog(jobId, tail ?? 20_000)),
  );

  server.tool(
    "tartarus_jobs",
    "List jobs with optional filters.",
    {
      limit: z.number().optional(),
      tag: z.string().optional(),
      status: z
        .enum(["queued", "running", "done", "failed", "killed", "timed_out"])
        .optional(),
      harnessId: z.string().optional(),
    },
    async (a) => text({ jobs: listJobsFiltered(a) }),
  );

  server.tool(
    "tartarus_wait",
    "Block until job finishes (or timeout). Convenience for the orchestrator.",
    {
      jobId: z.string(),
      timeoutMs: z.number().optional(),
    },
    async ({ jobId, timeoutMs }) => {
      try {
        const job = await waitForJob(jobId, timeoutMs ?? 60 * 60_000);
        return text({ job });
      } catch (e) {
        return text({ error: e instanceof Error ? e.message : String(e) });
      }
    },
  );

  server.tool(
    "tartarus_inspect",
    "Git facts for a path/worktree: status, diffstat, patch preview. No ranking.",
    {
      path: z.string(),
      patchLimit: z.number().optional(),
    },
    async ({ path, patchLimit }) =>
      text(inspectPath(path, { patchLimit })),
  );

  server.tool(
    "tartarus_inspect_jobs",
    "Git facts for jobs (by tag or ids) so YOU can compare and pick a winner.",
    {
      tag: z.string().optional(),
      jobIds: z.array(z.string()).optional(),
    },
    async (a) => text(inspectJobs(a)),
  );

  server.tool(
    "tartarus_kill",
    "Kill one job.",
    { jobId: z.string() },
    async ({ jobId }) => text({ killed: killJob(jobId) }),
  );

  server.tool(
    "tartarus_kill_tag",
    "Kill all running jobs with a tag.",
    { tag: z.string() },
    async ({ tag }) => text(killByTag(tag)),
  );

  server.tool(
    "tartarus_cleanup_tag",
    "Kill running jobs with tag + remove their worktrees. YOU call this on losers.",
    {
      tag: z.string(),
      killRunning: z.boolean().optional(),
      removeWorktrees: z.boolean().optional(),
    },
    async (a) => text(cleanupTag(a.tag, a)),
  );

  return server;
}

export async function runMcpStdio(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
