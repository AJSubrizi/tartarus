import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync, } from "node:fs";
import { basename, join, resolve } from "node:path";
import { store } from "./state.js";
function git(repo, args) {
    const r = spawnSync("git", ["-C", repo, ...args], {
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
    });
    return {
        ok: r.status === 0,
        out: (r.stdout ?? "").trim(),
        err: (r.stderr ?? "").trim(),
    };
}
export function isGitRepo(path) {
    return git(path, ["rev-parse", "--is-inside-work-tree"]).out === "true";
}
export function resolveRepoRoot(path) {
    const g = git(path, ["rev-parse", "--show-toplevel"]);
    return g.ok && g.out ? g.out : resolve(path);
}
function sanitize(branch) {
    return branch
        .replace(/[^a-zA-Z0-9._/-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
}
function baseDir(repo) {
    return join(repo, ".tartarus", "worktrees");
}
/** Primitive: create isolated worktree + copy env. No policy. */
export function createWorktree(opts) {
    const repoIn = opts.repo ?? store.state.projectRoot ?? process.cwd();
    if (!isGitRepo(repoIn)) {
        return { ok: false, error: `not a git repo: ${repoIn}` };
    }
    const repo = resolveRepoRoot(repoIn);
    const branch = sanitize(opts.branch);
    const dir = join(baseDir(repo), branch.replace(/\//g, "__"));
    mkdirSync(baseDir(repo), { recursive: true });
    if (existsSync(dir) && git(dir, ["rev-parse", "--is-inside-work-tree"]).ok) {
        return { ok: true, path: dir, branch };
    }
    let r = git(repo, ["worktree", "add", "-B", branch, dir, "HEAD"]);
    if (!r.ok)
        r = git(repo, ["worktree", "add", dir, branch]);
    if (!r.ok) {
        return { ok: false, error: r.err || r.out || "worktree add failed" };
    }
    for (const name of store.state.envCopy) {
        const src = join(repo, name);
        if (existsSync(src) && statSync(src).isFile()) {
            try {
                copyFileSync(src, join(dir, basename(name)));
            }
            catch {
                /* ignore */
            }
        }
    }
    try {
        writeFileSync(join(dir, ".tartarus.json"), JSON.stringify({ branch, createdAt: Date.now() }, null, 2));
    }
    catch {
        /* ignore */
    }
    return { ok: true, path: dir, branch };
}
export function removeWorktree(opts) {
    const repoIn = opts.repo ?? store.state.projectRoot ?? process.cwd();
    if (isGitRepo(repoIn)) {
        const repo = resolveRepoRoot(repoIn);
        const r = git(repo, [
            "worktree",
            "remove",
            ...(opts.force !== false ? ["--force"] : []),
            opts.path,
        ]);
        git(repo, ["worktree", "prune"]);
        if (r.ok)
            return { ok: true };
    }
    try {
        rmSync(opts.path, { recursive: true, force: true });
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
}
export function listWorktrees(repo) {
    const repoIn = repo ?? store.state.projectRoot ?? process.cwd();
    if (!isGitRepo(repoIn))
        return [];
    const base = baseDir(resolveRepoRoot(repoIn));
    if (!existsSync(base))
        return [];
    return readdirSync(base)
        .map((n) => join(base, n))
        .filter((p) => {
        try {
            return statSync(p).isDirectory();
        }
        catch {
            return false;
        }
    });
}
