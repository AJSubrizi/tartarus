/**
 * Tartarus MCP — tools for the MAIN harness (the orchestrator).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { store } from "./state.js";
import { cleanupTag, connectHarness, createWorktree, disconnectHarness, fanout, getJobHandoff, getJobLog, inspectJobs, inspectPath, killByTag, killJob, listAdapters, listJobsFiltered, listWorktrees, previewContext, refreshHarnesses, removeWorktree, runOnHarness, setProjectDna, snapshot, waitForJob, } from "./runtime.js";
import { buildRun, formatCommandLine } from "./harnesses.js";
import { VERSION } from "./doctor.js";
const contextSchema = z
    .object({
    goal: z.string().optional(),
    constraints: z.array(z.string()).optional(),
    notes: z.array(z.string()).optional(),
    files: z
        .array(z.string())
        .optional()
        .describe("Relative paths to inline into the brief"),
    handoffFromJobId: z
        .string()
        .optional()
        .describe("Prior job id — inject handoff summary"),
    extraMarkdown: z.string().optional(),
    skipProjectGuides: z.boolean().optional(),
})
    .optional();
function text(data) {
    return {
        content: [
            {
                type: "text",
                text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
            },
        ],
    };
}
export function createMcpServer() {
    const server = new McpServer({
        name: "tartarus",
        version: VERSION,
    });
    server.tool("tartarus_help", "Read first. YOU orchestrate; Tartarus packages context and spawns workers.", {}, async () => text(`TARTARUS ${VERSION}

YOU = orchestrator. Tartarus = context pack + worktree + spawn + inspect.

Context contract:
- Pass a full brief in prompt and/or context { goal, constraints, notes, files, handoffFromJobId }
- Tartarus builds .tartarus/brief-<job>.md in the workspace
- Project guides (AGENTS.md, CLAUDE.md, …) are listed if present
- Optional setup commands via tartarus_set_dna { setup: ["pnpm install"], autoSetup: true }

Flow:
1. tartarus_set_project
2. tartarus_preview_context (optional)
3. tartarus_run / tartarus_fanout with context
4. tartarus_wait → tartarus_handoff / tartarus_inspect_jobs
5. YOU pick winner → cleanup_tag losers
`));
    server.tool("tartarus_status", "Snapshot: harnesses, jobs, worktrees, dna.", {}, async () => text(snapshot()));
    server.tool("tartarus_adapters", "CLI adapters: binaries, path, version, headless notes.", {}, async () => text({ adapters: listAdapters() }));
    server.tool("tartarus_refresh", "Probe PATH + versions.", {}, async () => text({ harnesses: refreshHarnesses() }));
    server.tool("tartarus_list_harnesses", "List registered harnesses.", {}, async () => text({ harnesses: store.listHarnesses() }));
    server.tool("tartarus_connect", "Register a harness CLI.", {
        id: z.string().optional(),
        kind: z.enum([
            "claude",
            "codex",
            "cursor",
            "opencode",
            "gemini",
            "grok",
            "glm",
            "pi",
            "zero",
            "custom",
        ]),
        command: z.string(),
        label: z.string().optional(),
        args: z.array(z.string()).optional(),
        model: z.string().optional(),
    }, async (a) => text({ harness: connectHarness(a) }));
    server.tool("tartarus_disconnect", "Unregister a harness.", { id: z.string() }, async ({ id }) => text({ removed: disconnectHarness(id) }));
    server.tool("tartarus_set_project", "Default repo root.", { path: z.string() }, async ({ path }) => {
        store.setProjectRoot(path);
        return text({ projectRoot: path });
    });
    server.tool("tartarus_set_env_copy", "Env filenames copied into worktrees.", { files: z.array(z.string()) }, async ({ files }) => {
        store.setEnvCopy(files);
        return text({ envCopy: files });
    });
    server.tool("tartarus_set_dna", "Project DNA: setup hooks, guide files, autoSetup after worktree create.", {
        setup: z
            .array(z.string())
            .optional()
            .describe('e.g. ["pnpm install", "pnpm build"]'),
        envCopy: z.array(z.string()).optional(),
        guideFiles: z.array(z.string()).optional(),
        autoSetup: z.boolean().optional(),
        portsBase: z.number().optional(),
    }, async (a) => text({ dna: setProjectDna(a) }));
    server.tool("tartarus_worktree_create", "Create isolated git worktree + env + optional setup.", {
        branch: z.string(),
        repo: z.string().optional(),
        runSetup: z.boolean().optional(),
    }, async (a) => text(createWorktree(a)));
    server.tool("tartarus_worktree_remove", "Remove a worktree path.", {
        path: z.string(),
        force: z.boolean().optional(),
    }, async (a) => text(removeWorktree(a)));
    server.tool("tartarus_worktree_list", "List Tartarus worktrees.", {}, async () => text({ worktrees: listWorktrees() }));
    server.tool("tartarus_preview_context", "Preview the brief that would be sent to a worker (no spawn).", {
        prompt: z.string(),
        context: contextSchema,
        harnessId: z.string().optional(),
        cwd: z.string().optional(),
    }, async (a) => text(previewContext(a)));
    server.tool("tartarus_preview_run", "Dry-run exact spawn argv (after context packaging).", {
        harnessId: z.string(),
        prompt: z.string(),
        context: contextSchema,
        cwd: z.string().optional(),
        model: z.string().optional(),
        safer: z.boolean().optional(),
    }, async (a) => {
        const h = store.getHarness(a.harnessId);
        if (!h)
            return text({ error: `unknown harness: ${a.harnessId}` });
        const cwd = a.cwd ?? store.state.projectRoot ?? process.cwd();
        const preview = previewContext({
            prompt: a.prompt,
            context: a.context,
            harnessId: a.harnessId,
            cwd,
        });
        const built = buildRun(h.kind, {
            prompt: preview.adapterPromptPreview,
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
            contextPreview: {
                guidesFound: preview.guidesFound,
                filesIncluded: preview.filesIncluded,
                briefChars: preview.brief.length,
            },
        });
    });
    server.tool("tartarus_run", "Spawn ONE harness with full context pack. YOU orchestrate next steps.", {
        harnessId: z.string(),
        prompt: z.string(),
        context: contextSchema,
        cwd: z.string().optional(),
        worktreeBranch: z.string().optional(),
        tag: z.string().optional(),
        timeoutMs: z.number().optional(),
        model: z.string().optional(),
        safer: z.boolean().optional(),
        runSetup: z.boolean().optional(),
    }, async (a) => {
        try {
            return text({ job: runOnHarness(a) });
        }
        catch (e) {
            return text({ error: e instanceof Error ? e.message : String(e) });
        }
    });
    server.tool("tartarus_fanout", "Spawn same context pack on many harnesses. No auto-winner.", {
        prompt: z.string(),
        context: contextSchema,
        harnessIds: z.array(z.string()).min(1),
        useWorktrees: z.boolean().optional().default(true),
        tag: z.string().optional(),
        timeoutMs: z.number().optional(),
        model: z.string().optional(),
        safer: z.boolean().optional(),
        runSetup: z.boolean().optional(),
    }, async (a) => {
        try {
            const result = fanout(a);
            return text({
                ...result,
                message: "Fan-out started. wait → inspect_jobs / handoff. YOU pick the winner.",
            });
        }
        catch (e) {
            return text({ error: e instanceof Error ? e.message : String(e) });
        }
    });
    server.tool("tartarus_job", "Job status + brief path + summary if finished.", { jobId: z.string() }, async ({ jobId }) => {
        const job = store.getJob(jobId);
        return job ? text({ job }) : text({ error: "job not found" });
    });
    server.tool("tartarus_handoff", "Handoff summary for next agent (markdown + metrics).", { jobId: z.string() }, async ({ jobId }) => {
        const h = getJobHandoff(jobId);
        return h
            ? text({ handoff: h })
            : text({ error: "job not found" });
    });
    server.tool("tartarus_logs", "Full job log from disk (durable).", {
        jobId: z.string(),
        tail: z.number().optional(),
    }, async ({ jobId, tail }) => text(getJobLog(jobId, tail ?? 20_000)));
    server.tool("tartarus_jobs", "List jobs with optional filters.", {
        limit: z.number().optional(),
        tag: z.string().optional(),
        status: z
            .enum(["queued", "running", "done", "failed", "killed", "timed_out"])
            .optional(),
        harnessId: z.string().optional(),
    }, async (a) => text({ jobs: listJobsFiltered(a) }));
    server.tool("tartarus_wait", "Block until job finishes. Returns job + handoff summary.", {
        jobId: z.string(),
        timeoutMs: z.number().optional(),
    }, async ({ jobId, timeoutMs }) => {
        try {
            const job = await waitForJob(jobId, timeoutMs ?? 60 * 60_000);
            const handoff = getJobHandoff(jobId);
            return text({ job, handoff });
        }
        catch (e) {
            return text({ error: e instanceof Error ? e.message : String(e) });
        }
    });
    server.tool("tartarus_inspect", "Git facts for a path/worktree.", {
        path: z.string(),
        patchLimit: z.number().optional(),
    }, async ({ path, patchLimit }) => text(inspectPath(path, { patchLimit })));
    server.tool("tartarus_inspect_jobs", "Git facts for jobs so YOU can compare and pick a winner.", {
        tag: z.string().optional(),
        jobIds: z.array(z.string()).optional(),
    }, async (a) => text(inspectJobs(a)));
    server.tool("tartarus_kill", "Kill one job.", { jobId: z.string() }, async ({ jobId }) => text({ killed: killJob(jobId) }));
    server.tool("tartarus_kill_tag", "Kill all running jobs with a tag.", { tag: z.string() }, async ({ tag }) => text(killByTag(tag)));
    server.tool("tartarus_cleanup_tag", "Kill + remove worktrees for a tag (losers).", {
        tag: z.string(),
        killRunning: z.boolean().optional(),
        removeWorktrees: z.boolean().optional(),
    }, async (a) => text(cleanupTag(a.tag, a)));
    return server;
}
export async function runMcpStdio() {
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
