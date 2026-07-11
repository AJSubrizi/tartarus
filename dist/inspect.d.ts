export interface InspectResult {
    path: string;
    isGit: boolean;
    branch?: string;
    head?: string;
    dirty: boolean;
    porcelain: string;
    filesChanged: number;
    additions: number;
    deletions: number;
    numstat: string;
    nameStatus: string;
    diffStat: string;
    /** Truncated patch (for orchestrator review) */
    patchPreview: string;
    error?: string;
}
export declare function inspectPath(path: string, opts?: {
    patchLimit?: number;
}): InspectResult;
/** Compare several paths (e.g. fanout worktrees) — facts only, sorted by filesChanged. */
export declare function inspectMany(paths: string[]): {
    results: InspectResult[];
    summary: Array<{
        path: string;
        branch?: string;
        filesChanged: number;
        additions: number;
        deletions: number;
        dirty: boolean;
        error?: string;
    }>;
};
