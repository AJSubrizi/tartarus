/**
 * Read-only git inspect primitives for the orchestrator agent.
 * No ranking / no winner — just facts.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
function git(cwd, args) {
    const r = spawnSync("git", ["-C", cwd, ...args], {
        encoding: "utf8",
        maxBuffer: 12 * 1024 * 1024,
    });
    return {
        ok: r.status === 0,
        out: (r.stdout ?? "").trim(),
        err: (r.stderr ?? "").trim(),
        code: r.status,
    };
}
export function inspectPath(path, opts) {
    const dir = resolve(path);
    const patchLimit = opts?.patchLimit ?? 12_000;
    if (!existsSync(dir)) {
        return empty(dir, `path not found: ${dir}`);
    }
    const inside = git(dir, ["rev-parse", "--is-inside-work-tree"]);
    if (!inside.ok || inside.out !== "true") {
        return empty(dir, "not a git worktree");
    }
    const branch = git(dir, ["rev-parse", "--abbrev-ref", "HEAD"]).out;
    const head = git(dir, ["rev-parse", "--short", "HEAD"]).out;
    const porcelain = git(dir, ["status", "--porcelain"]).out;
    const numstat = git(dir, ["diff", "--numstat", "HEAD"]).out;
    // include staged
    const numstatStaged = git(dir, ["diff", "--numstat", "--cached"]).out;
    const nameStatus = git(dir, ["diff", "--name-status", "HEAD"]).out;
    const diffStat = git(dir, ["diff", "--stat", "HEAD"]).out;
    const patch = git(dir, ["diff", "HEAD"]).out;
    const patchStaged = git(dir, ["diff", "--cached"]).out;
    const combinedPatch = [patch, patchStaged].filter(Boolean).join("\n");
    let additions = 0;
    let deletions = 0;
    let files = 0;
    for (const block of [numstat, numstatStaged]) {
        for (const line of block.split("\n")) {
            if (!line.trim())
                continue;
            const [a, d] = line.split("\t");
            const ai = parseInt(a, 10);
            const di = parseInt(d, 10);
            if (!Number.isNaN(ai))
                additions += ai;
            if (!Number.isNaN(di))
                deletions += di;
            files += 1;
        }
    }
    if (files === 0 && porcelain) {
        files = porcelain.split("\n").filter(Boolean).length;
    }
    return {
        path: dir,
        isGit: true,
        branch,
        head,
        dirty: Boolean(porcelain) || Boolean(numstat) || Boolean(numstatStaged),
        porcelain,
        filesChanged: files,
        additions,
        deletions,
        numstat: [numstat, numstatStaged].filter(Boolean).join("\n"),
        nameStatus,
        diffStat,
        patchPreview: combinedPatch.length > patchLimit
            ? combinedPatch.slice(0, patchLimit) + "\n…[truncated]"
            : combinedPatch,
    };
}
function empty(path, error) {
    return {
        path,
        isGit: false,
        dirty: false,
        porcelain: "",
        filesChanged: 0,
        additions: 0,
        deletions: 0,
        numstat: "",
        nameStatus: "",
        diffStat: "",
        patchPreview: "",
        error,
    };
}
/** Compare several paths (e.g. fanout worktrees) — facts only, sorted by filesChanged. */
export function inspectMany(paths) {
    const results = paths.map((p) => inspectPath(p));
    const summary = results
        .map((r) => ({
        path: r.path,
        branch: r.branch,
        filesChanged: r.filesChanged,
        additions: r.additions,
        deletions: r.deletions,
        dirty: r.dirty,
        error: r.error,
    }))
        .sort((a, b) => b.filesChanged - a.filesChanged || b.additions - a.additions);
    return { results, summary };
}
