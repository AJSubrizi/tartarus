export interface WorktreeResult {
    ok: boolean;
    path?: string;
    branch?: string;
    error?: string;
    setupRan?: string[];
    setupErrors?: string[];
}
export declare function isGitRepo(path: string): boolean;
export declare function resolveRepoRoot(path: string): string;
export declare function runSetupCommands(cwd: string, commands?: string[]): {
    ran: string[];
    errors: string[];
};
/** Primitive: create isolated worktree + env + optional setup. */
export declare function createWorktree(opts: {
    repo?: string;
    branch: string;
    /** Override dna.autoSetup */
    runSetup?: boolean;
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
