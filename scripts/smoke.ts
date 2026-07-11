/**
 * End-to-end smoke of Tartarus primitives without calling paid APIs.
 * Uses TEMP git repo + TEMP state file — never pollutes real ~/.tartarus/state.json.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT = join(__dirname, "..");
const WORKER = join(__dirname, "smoke-worker.sh");

// Isolate state BEFORE loading runtime/store
const SMOKE_DIR = mkdtempSync(join(tmpdir(), "tartarus-smoke-state-"));
process.env.TARTARUS_STATE = join(SMOKE_DIR, "state.json");
process.env.TARTARUS_LOG_DIR = join(SMOKE_DIR, "logs");

const {
  cleanupTag,
  connectHarness,
  createWorktree,
  disconnectHarness,
  fanout,
  getJobHandoff,
  getJobLog,
  inspectJobs,
  inspectPath,
  killJob,
  listAdapters,
  previewContext,
  refreshHarnesses,
  removeWorktree,
  runOnHarness,
  setProjectDna,
  snapshot,
  waitForJob,
} = await import("../src/runtime.js");
const { store } = await import("../src/state.js");
const { buildRun, formatCommandLine } = await import("../src/harnesses.js");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Isolated playground — never the real Tartarus checkout */
function makeTempGitRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "tartarus-smoke-repo-"));
  const run = (args: string[]) => {
    const r = spawnSync("git", ["-C", dir, ...args], { encoding: "utf8" });
    if (r.status !== 0) {
      throw new Error(`git ${args.join(" ")}: ${r.stderr || r.stdout}`);
    }
  };
  run(["init"]);
  run(["config", "user.email", "smoke@tartarus.local"]);
  run(["config", "user.name", "Tartarus Smoke"]);
  writeFileSync(join(dir, "README.md"), "# smoke playground\n");
  writeFileSync(join(dir, "package.json"), '{"name":"smoke-playground"}\n');
  run(["add", "."]);
  run(["commit", "-m", "smoke playground init"]);
  return dir;
}

async function main() {
  console.log("Tartarus smoke — primitives only, no LLM APIs\n");
  console.log("· isolated state", process.env.TARTARUS_STATE);

  spawnSync("chmod", ["+x", WORKER]);
  assert(existsSync(WORKER), "smoke-worker.sh missing");

  const playground = makeTempGitRepo();
  console.log("✓ temp playground", playground);

  store.setProjectRoot(playground);
  console.log("✓ project root set to playground (not the Tartarus repo)");

  try {
    const harnesses = refreshHarnesses();
    console.log(
      "✓ refresh",
      harnesses.map((h) => `${h.id}:${h.status}`).join(" "),
    );

    const adapters = listAdapters();
    assert(adapters.length >= 4, "adapters catalog empty");
    console.log(
      "✓ adapters",
      adapters.filter((a) => a.resolved).map((a) => a.kind).join(", "),
    );

    const claude = store.getHarness("claude");
    if (claude && claude.status === "ready") {
      const built = buildRun("claude", {
        prompt: "smoke",
        cwd: playground,
        baseArgs: [],
      });
      const line = formatCommandLine("claude", built.args);
      assert(line.includes("-p"), "claude preview missing -p");
      assert(
        line.includes("dangerously-skip-permissions"),
        "claude preview missing skip-permissions",
      );
      console.log("✓ preview claude:", built.summary);
    } else {
      console.log("· skip claude preview (not ready)");
    }

    const branch = `tartarus/smoke-${Date.now().toString(36)}`;
    const wt = createWorktree({ repo: playground, branch });
    assert(wt.ok && wt.path, `worktree create: ${wt.error}`);
    assert(existsSync(wt.path!), "worktree path missing");
    console.log("✓ worktree", wt.path);

    const fake = connectHarness({
      id: "smoke",
      kind: "custom",
      label: "Smoke Worker",
      command: WORKER,
      args: [],
    });
    if (fake.status === "missing") {
      store.upsertHarness({ ...fake, status: "ready", lastError: undefined });
    }
    console.log("✓ connected smoke harness");

    // Context pack preview
    writeFileSync(join(playground, "NOTES.md"), "important note for workers\n");
    setProjectDna({ guideFiles: ["README.md", "NOTES.md"], autoSetup: false });
    const prev = previewContext({
      prompt: "smoke-run-please",
      context: {
        constraints: ["do not push", "keep diff small"],
        notes: ["this is a smoke test"],
        files: ["NOTES.md"],
      },
      cwd: playground,
    });
    assert(prev.brief.includes("smoke-run-please"), "brief missing goal");
    assert(prev.brief.includes("do not push"), "brief missing constraints");
    assert(prev.filesIncluded.includes("NOTES.md"), "brief missing file");
    console.log("✓ preview_context", prev.guidesFound.join(","));

    const job = runOnHarness({
      harnessId: "smoke",
      prompt: "smoke-run-please",
      context: {
        constraints: ["keep it minimal"],
        files: ["NOTES.md"],
      },
      worktreeBranch: `tartarus/smoke-job-${Date.now().toString(36)}`,
      tag: "smoke",
      timeoutMs: 10_000,
    });
    assert(job.commandLine, "commandLine missing on job");
    assert(job.briefPath, "briefPath missing");
    assert(existsSync(job.briefPath!), "brief file not written");
    assert(
      (job.renderedBrief ?? "").includes("keep it minimal"),
      "rendered brief missing constraint",
    );
    console.log("✓ spawned", job.id, "brief", job.briefPath);

    const done = await waitForJob(job.id, 15_000);
    assert(done.status === "done", `job status=${done.status} err=${done.error}`);
    assert(done.worktree, "job should have worktree");
    const okFile = join(done.worktree!, ".tartarus-smoke-ok");
    assert(existsSync(okFile), "worker did not write .tartarus-smoke-ok");
    console.log("✓ job done", readFileSync(okFile, "utf8").trim());

    const handoff = getJobHandoff(done.id);
    assert(handoff?.handoffMarkdown.includes(done.id), "handoff missing");
    console.log("✓ handoff", handoff?.filesChanged, "files");

    const logs = getJobLog(job.id);
    assert(logs.fromFile || logs.content.includes("smoke"), "log missing");
    console.log("✓ durable log", logs.logPath);

    const insp = inspectPath(done.worktree!);
    assert(insp.isGit, "inspect should see git");
    console.log(
      "✓ inspect",
      `files=${insp.filesChanged} +${insp.additions}/-${insp.deletions}`,
    );

    connectHarness({
      id: "smoke-b",
      kind: "custom",
      label: "Smoke B",
      command: WORKER,
      args: [],
    });
    const sb = store.getHarness("smoke-b");
    if (sb?.status === "missing") {
      store.upsertHarness({ ...sb, status: "ready", lastError: undefined });
    }

    const { tag, jobs } = fanout({
      prompt: "fanout-smoke",
      harnessIds: ["smoke", "smoke-b"],
      useWorktrees: true,
      tag: `smoke-fan-${Date.now().toString(36)}`,
      timeoutMs: 10_000,
    });
    assert(jobs.length === 2, `fanout expected 2 got ${jobs.length}`);
    console.log("✓ fanout", tag);

    const finished = await Promise.all(
      jobs.map((j) => waitForJob(j.id, 15_000)),
    );
    for (const j of finished) {
      assert(j.status === "done", `fanout job ${j.id} status=${j.status}`);
    }
    console.log("✓ fanout both done");

    const board = inspectJobs({ tag });
    assert(board.summary.length >= 1, "inspect_jobs empty");
    console.log("✓ inspect_jobs", board.summary.length, "paths");

    // Sleeper ignores brief argv — always sleeps 20s so we can kill it
    const sleepSh = join(SMOKE_DIR, "sleep20.sh");
    writeFileSync(
      sleepSh,
      "#!/usr/bin/env bash\nsleep 20\necho sleeper-done\n",
    );
    spawnSync("chmod", ["+x", sleepSh]);
    connectHarness({
      id: "sleeper",
      kind: "custom",
      label: "Sleeper",
      command: sleepSh,
      args: [],
    });
    const sleeper = store.getHarness("sleeper");
    if (sleeper?.status === "missing") {
      store.upsertHarness({ ...sleeper, status: "ready", lastError: undefined });
    }

    const longJob = runOnHarness({
      harnessId: "sleeper",
      prompt: "ignore-me-sleeping",
      tag: "kill-test",
      timeoutMs: 60_000,
    });
    await sleep(300);
    const killedOk = killJob(longJob.id);
    const afterKill = await waitForJob(longJob.id, 5_000);
    assert(
      killedOk ||
        ["killed", "timed_out", "failed", "done"].includes(afterKill.status),
      `kill failed status=${afterKill.status}`,
    );
    console.log("✓ kill", afterKill.status, killedOk ? "(signaled)" : "(already ended)");

    const cleaned = cleanupTag(tag, {
      killRunning: true,
      removeWorktrees: true,
    });
    console.log("✓ cleanup_tag", cleaned.removedWorktrees.length, "worktrees");
    if (done.worktree && existsSync(done.worktree)) {
      removeWorktree({ path: done.worktree, force: true });
    }
    if (wt.path) removeWorktree({ path: wt.path, force: true });
    console.log("✓ worktree cleanup");

    // Never leave fake harnesses around (extra safety even with temp state)
    for (const id of ["smoke", "smoke-b", "sleeper"]) {
      disconnectHarness(id);
    }

    const snap = snapshot();
    console.log(
      "\n✓ snapshot ok — jobs:",
      snap.jobs.length,
      "active:",
      snap.activeJobIds.length,
    );
    console.log("\nSMOKE PASSED\n");
  } finally {
    store.setProjectRoot(PROJECT);
    try {
      rmSync(playground, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    try {
      rmSync(SMOKE_DIR, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

main().catch((e) => {
  console.error("\nSMOKE FAILED\n", e);
  process.exit(1);
});
