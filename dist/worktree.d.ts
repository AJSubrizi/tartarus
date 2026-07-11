export interface WorktreeResult {
    ok: boolean;
    path?: string;
    branch?: string;
    error?: string;
}
export declare function isGitRepo(path: string): boolean;
export declare function resolveRepoRoot(path: string): string;
/** Primitive: create isolated worktree + copy env. No policy. */
export declare function createWorktree(opts: {
    repo?: string;
    branch: string;
}): WorktreeResult;
export declare function removeWorktree(opts: {
    repo?: string;
    path: string;
    force?: boolean;
}): {
    ok: boolean;
    error?: string;
};
export declare function listWorktrees(repo?: string): string[];
