/**
 * Tartarus runtime — PRIMITIVES only.
 * Main harness orchestrates; we spawn, inspect, and report.
 */
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { store } from "./state.js";
import { buildRun, formatCommandLine, probeAll, probeHarness, spawnHarness, } from "./harnesses.js";
import { createWorktree, listWorktrees, removeWorktree } from "./worktree.js";
import { adapterCatalog } from "./adapters.js";
import { inspectMany, inspectPath } from "./inspect.js";
import { appendJobLog, jobLogPath, readJobLog, writeJobLogHeader, } from "./logs.js";
import { bus } from "./bus.js";
import { uid } from "./id.js";
const active = new Map();
const waiters = new Map();
function terminal(s) {
    return ["done", "failed", "killed", "timed_out"].includes(s);
}
function flushLogTail(jobId, force = false) {
    const run = active.get(jobId);
    if (!run || (!run.logBuf && !force))
        return;
    const chunk = run.logBuf;
    run.logBuf = "";
    if (run.flushTimer) {
        clearTimeout(run.flushTimer);
        run.flushTimer = undefined;
    }
    if (!chunk)
        return;
    appendJobLog(jobId, chunk);
    const j = store.getJob(jobId);
    if (!j)
        return;
    // keep in-memory tail for MCP without rewriting whole state every byte
    store.updateJob(jobId, {
        logTail: (j.logTail + chunk).slice(-24_000),
    });
    bus.emitEvent({ type: "log", jobId, bytes: chunk.length });
}
function pushLog(jobId, chunk) {
    appendJobLog(jobId, chunk); // durable immediately
    const run = active.get(jobId);
    const j = store.getJob(jobId);
    if (!j)
        return;
    // debounce state.json writes
    if (run) {
        run.logBuf += chunk;
        if (!run.flushTimer) {
            run.flushTimer = setTimeout(() => flushLogTail(jobId), 400);
        }
    }
    else {
        store.updateJob(jobId, {
            logTail: (j.logTail + chunk).slice(-24_000),
        });
    }
    bus.emitEvent({ type: "log", jobId, bytes: chunk.length });
}
function notifyWaiters(jobId) {
    const list = waiters.get(jobId);
    if (!list?.length)
        return;
    waiters.delete(jobId);
    const job = store.getJob(jobId);
    for (const w of list) {
        clearTimeout(w.timer);
        if (job)
            w.resolve(job);
        else
            w.reject(new Error("job missing"));
    }
}
// ── harness registry ───────────────────────────────────────
export function refreshHarnesses() {
    const next = probeAll(store.listHarnesses());
    for (const h of next)
        store.upsertHarness(h);
    return store.listHarnesses();
}
export function connectHarness(input) {
    const id = input.id ?? input.kind;
    return store.upsertHarness(probeHarness({
        id,
        kind: input.kind,
        label: input.label ?? input.command,
        command: input.command,
        args: input.args ?? [],
        status: "unknown",
        model: input.model,
    }));
}
export function disconnectHarness(id) {
    return store.removeHarness(id);
}
export function listAdapters() {
    return adapterCatalog();
}
// ── worktree + inspect ─────────────────────────────────────
export { createWorktree, removeWorktree, listWorktrees };
export { inspectPath, inspectMany };
// ── spawn primitive ────────────────────────────────────────
export function runOnHarness(input) {
    const harness = store.getHarness(input.harnessId);
    if (!harness)
        throw new Error(`unknown harness: ${input.harnessId}`);
    const probed = probeHarness(harness);
    store.upsertHarness(probed);
    if (probed.status === "missing") {
        throw new Error(probed.lastError ?? "harness missing");
    }
    let cwd = resolve(input.cwd ?? store.state.projectRoot ?? process.cwd());
    let worktree;
    let branch = input.worktreeBranch;
    if (!existsSync(cwd) || !statSync(cwd).isDirectory()) {
        throw new Error(`cwd does not exist or is not a directory: ${cwd}`);
    }
    if (branch) {
        const wt = createWorktree({ repo: cwd, branch });
        if (!wt.ok || !wt.path)
            throw new Error(wt.error ?? "worktree failed");
        cwd = wt.path;
        worktree = wt.path;
        branch = wt.branch ?? branch;
    }
    const built = buildRun(harness.kind, {
        prompt: input.prompt,
        cwd,
        baseArgs: harness.args,
        model: input.model ?? harness.model,
        safer: input.safer,
    });
    const command = probed.command;
    const commandLine = formatCommandLine(command, built.args);
    const jobId = uid("job");
    const header = `[tartarus] job=${jobId}\n` +
        `[tartarus] harness=${harness.id} kind=${harness.kind}\n` +
        `[tartarus] spawn: ${built.summary}\n` +
        `[tartarus] cwd: ${cwd}\n` +
        `[tartarus] cmd: ${commandLine}\n` +
        `[tartarus] started: ${new Date().toISOString()}\n\n`;
    writeJobLogHeader(jobId, header);
    const job = {
        id: jobId,
        harnessId: harness.id,
        prompt: input.prompt,
        cwd,
        worktree,
        branch,
        tag: input.tag,
        status: "running",
        startedAt: Date.now(),
        timeoutMs: input.timeoutMs ?? store.state.defaultTimeoutMs,
        logTail: header.slice(0, 24_000),
        commandLine,
        resolvedCommand: probed.resolvedPath ?? command,
        adapterSummary: built.summary,
        promptFile: built.promptFile,
    };
    store.addJob(job);
    store.upsertHarness({ ...probed, status: "busy" });
    bus.emitEvent({ type: "job", jobId, status: "running" });
    bus.emitEvent({ type: "harness", harnessId: harness.id, status: "busy" });
    const timeoutMs = job.timeoutMs;
    let settled = false;
    const handle = spawnHarness({
        command,
        args: built.args,
        cwd,
        env: {
            TARTARUS_JOB_ID: job.id,
            TARTARUS_LOG: jobLogPath(job.id),
            ...(worktree ? { TARTARUS_WORKTREE: worktree } : {}),
            ...built.env,
        },
        onData: (chunk) => pushLog(job.id, chunk),
        onExit: (code, signal) => {
            if (settled)
                return;
            settled = true;
            const run = active.get(job.id);
            if (run?.timer)
                clearTimeout(run.timer);
            if (run?.flushTimer)
                clearTimeout(run.flushTimer);
            flushLogTail(job.id, true);
            active.delete(job.id);
            const cur = store.getJob(job.id);
            if (cur && terminal(cur.status)) {
                releaseHarness(harness.id);
                notifyWaiters(job.id);
                return;
            }
            const killed = signal === "SIGTERM" || signal === "SIGKILL";
            const status = killed
                ? "killed"
                : code === 0
                    ? "done"
                    : "failed";
            const footer = `\n[tartarus] exit status=${status} code=${code} signal=${signal} at ${new Date().toISOString()}\n`;
            appendJobLog(job.id, footer);
            const j = store.getJob(job.id);
            store.updateJob(job.id, {
                status,
                exitCode: code,
                finishedAt: Date.now(),
                error: status === "failed"
                    ? `exit ${code}${j?.logTail ? "" : " (no output)"}`
                    : undefined,
                logTail: ((j?.logTail ?? "") + footer).slice(-24_000),
            });
            bus.emitEvent({ type: "job", jobId: job.id, status });
            releaseHarness(harness.id);
            notifyWaiters(job.id);
        },
    });
    if (handle.pid < 0) {
        store.updateJob(job.id, {
            status: "failed",
            error: "spawn failed (no pid)",
            finishedAt: Date.now(),
        });
        appendJobLog(job.id, "[tartarus] spawn failed (no pid)\n");
        releaseHarness(harness.id);
        bus.emitEvent({ type: "job", jobId: job.id, status: "failed" });
        notifyWaiters(job.id);
        return store.getJob(job.id);
    }
    store.updateJob(job.id, { pid: handle.pid });
    const timer = setTimeout(() => {
        if (settled)
            return;
        settled = true;
        handle.kill("SIGTERM");
        setTimeout(() => handle.kill("SIGKILL"), 4_000);
        const run = active.get(job.id);
        if (run?.flushTimer)
            clearTimeout(run.flushTimer);
        flushLogTail(job.id, true);
        active.delete(job.id);
        const footer = `\n[tartarus] timed out after ${timeoutMs}ms\n`;
        appendJobLog(job.id, footer);
        const j = store.getJob(job.id);
        store.updateJob(job.id, {
            status: "timed_out",
            finishedAt: Date.now(),
            error: `timeout ${timeoutMs}ms`,
            logTail: ((j?.logTail ?? "") + footer).slice(-24_000),
        });
        bus.emitEvent({ type: "job", jobId: job.id, status: "timed_out" });
        releaseHarness(harness.id);
        notifyWaiters(job.id);
    }, timeoutMs);
    active.set(job.id, { handle, timer, logBuf: "" });
    return store.getJob(job.id);
}
function releaseHarness(harnessId) {
    const busy = store
        .listJobs(80)
        .some((j) => j.harnessId === harnessId && j.status === "running");
    const h = store.getHarness(harnessId);
    if (h && !busy) {
        store.upsertHarness({ ...h, status: "ready" });
        bus.emitEvent({ type: "harness", harnessId, status: "ready" });
    }
}
export function killJob(jobId) {
    const run = active.get(jobId);
    const job = store.getJob(jobId);
    if (run) {
        if (run.timer)
            clearTimeout(run.timer);
        if (run.flushTimer)
            clearTimeout(run.flushTimer);
        flushLogTail(jobId, true);
        run.handle.kill("SIGTERM");
        setTimeout(() => run.handle.kill("SIGKILL"), 3_000);
        active.delete(jobId);
    }
    if (job && !terminal(job.status)) {
        const footer = "\n[tartarus] killed by request\n";
        appendJobLog(jobId, footer);
        store.updateJob(jobId, {
            status: "killed",
            finishedAt: Date.now(),
            logTail: (job.logTail ?? "") + footer,
        });
        bus.emitEvent({ type: "job", jobId, status: "killed" });
        releaseHarness(job.harnessId);
        notifyWaiters(jobId);
        return true;
    }
    return Boolean(run);
}
export function killByTag(tag) {
    const killed = [];
    for (const j of store.listJobs(150)) {
        if (j.tag === tag && !terminal(j.status)) {
            if (killJob(j.id))
                killed.push(j.id);
        }
    }
    return { killed };
}
export function waitForJob(jobId, timeoutMs = 60 * 60_000) {
    const job = store.getJob(jobId);
    if (job && terminal(job.status))
        return Promise.resolve(job);
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            const list = waiters.get(jobId) ?? [];
            waiters.set(jobId, list.filter((w) => w.timer !== timer));
            reject(new Error(`wait timeout for ${jobId}`));
        }, timeoutMs);
        const entry = { resolve, reject, timer };
        const list = waiters.get(jobId) ?? [];
        list.push(entry);
        waiters.set(jobId, list);
    });
}
/**
 * Fan-out: spawn N jobs. No winner logic.
 */
export function fanout(input) {
    const ids = [...new Set(input.harnessIds)];
    if (ids.length < 1)
        throw new Error("need at least one harness");
    const tag = input.tag ?? `fanout_${Date.now().toString(36)}`;
    const jobs = [];
    const errors = [];
    for (const hid of ids) {
        try {
            jobs.push(runOnHarness({
                harnessId: hid,
                prompt: input.prompt,
                worktreeBranch: input.useWorktrees !== false
                    ? `tartarus/${tag}-${hid}`
                    : undefined,
                tag,
                timeoutMs: input.timeoutMs,
                model: input.model,
                safer: input.safer,
            }));
        }
        catch (e) {
            errors.push(`${hid}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    if (!jobs.length) {
        throw new Error(`fanout failed for all harnesses:\n${errors.join("\n")}`);
    }
    return { tag, jobs, errors };
}
/** Facts for orchestrator to compare fanout results */
export function inspectJobs(opts) {
    let jobs = store.listJobs(100);
    if (opts.tag)
        jobs = jobs.filter((j) => j.tag === opts.tag);
    if (opts.jobIds?.length) {
        const set = new Set(opts.jobIds);
        jobs = jobs.filter((j) => set.has(j.id));
    }
    const paths = jobs
        .map((j) => j.worktree ?? j.cwd)
        .filter((p) => Boolean(p));
    const unique = [...new Set(paths)];
    const inspected = inspectMany(unique);
    return {
        ...inspected,
        jobs: jobs.map((j) => ({
            jobId: j.id,
            harnessId: j.harnessId,
            status: j.status,
            path: j.worktree ?? j.cwd,
        })),
    };
}
export function cleanupTag(tag, opts) {
    const killed = [];
    const removedWorktrees = [];
    const errors = [];
    if (opts?.killRunning !== false) {
        killed.push(...killByTag(tag).killed);
    }
    if (opts?.removeWorktrees !== false) {
        for (const j of store.listJobs(150).filter((x) => x.tag === tag)) {
            if (!j.worktree)
                continue;
            const r = removeWorktree({ path: j.worktree, force: true });
            if (r.ok)
                removedWorktrees.push(j.worktree);
            else
                errors.push(`${j.worktree}: ${r.error}`);
        }
    }
    return { killed, removedWorktrees, errors };
}
export function getJobLog(jobId, tail = 20_000) {
    const job = store.getJob(jobId);
    const file = readJobLog(jobId, { tail });
    return {
        jobId,
        status: job?.status,
        logPath: file.path,
        fromFile: file.exists,
        content: file.exists ? file.content : (job?.logTail ?? ""),
    };
}
export function listJobsFiltered(opts) {
    let jobs = store.listJobs(opts?.limit ?? 40);
    if (opts?.tag)
        jobs = jobs.filter((j) => j.tag === opts.tag);
    if (opts?.status)
        jobs = jobs.filter((j) => j.status === opts.status);
    if (opts?.harnessId) {
        jobs = jobs.filter((j) => j.harnessId === opts.harnessId);
    }
    return jobs;
}
export function snapshot() {
    return {
        role: "primitive_runtime",
        note: "You (the calling agent) are the orchestrator. Tartarus only spawns and reports.",
        projectRoot: store.state.projectRoot,
        envCopy: store.state.envCopy,
        harnesses: store.listHarnesses(),
        jobs: store.listJobs(40),
        activeJobIds: [...active.keys()],
        worktrees: listWorktrees(),
        adapters: adapterCatalog(),
        logDir: jobLogPath("_").replace("/_.log", ""),
    };
}
// After process restart, mark stale running jobs
for (const j of store.listJobs(80)) {
    if (j.status === "running") {
        store.updateJob(j.id, {
            status: "failed",
            error: "orphaned after restart",
            finishedAt: Date.now(),
        });
    }
}
for (const h of store.listHarnesses()) {
    if (h.status === "busy")
        store.upsertHarness({ ...h, status: "ready" });
}
