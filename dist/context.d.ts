import type { ContextPack, Job, JobSummary, ProjectDna } from "./types.js";
export declare const DEFAULT_GUIDE_FILES: string[];
export interface BuiltContext {
    brief: string;
    briefPath?: string;
    goal: string;
    filesIncluded: string[];
    guidesFound: string[];
    handoffFrom?: string;
}
/**
 * Copy non-gitignored context files into worktree if missing
 * (guides are usually already in git; this helps untracked notes).
 */
export declare function materializeContextFiles(root: string, worktree: string, files: string[]): string[];
export declare function findProjectGuides(root: string, dna?: ProjectDna): string[];
export declare function buildHandoffSummary(job: Job): JobSummary;
export declare function renderBrief(opts: {
    goal: string;
    root: string;
    worktree?: string;
    context?: ContextPack;
    harnessId: string;
    jobId: string;
    tag?: string;
}): BuiltContext;
/** Write brief into worktree (or tmp) and return path + text */
export declare function writeBriefFile(brief: string, cwd: string, jobId: string): string;
/**
 * Final prompt string for adapters: prefer pointing at brief file in workspace
 * so ARG_MAX and sandbox both work.
 */
export declare function promptForAdapter(briefPath: string, goal: string): string;
export declare function mergeContext(prompt: string, context?: ContextPack): {
    goal: string;
    context: ContextPack;
};
