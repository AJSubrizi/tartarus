import { createWorktree, listWorktrees, removeWorktree } from "./worktree.js";
import { inspectMany, inspectPath } from "./inspect.js";
import type { ContextPack, Harness, Job, JobStatus, ProjectDna } from "./types.js";
export declare function refreshHarnesses(): Harness[];
export declare function connectHarness(input: {
    id?: string;
    kind: Harness["kind"];
    label?: string;
    command: string;
    args?: string[];
    model?: string;
}): Harness;
export declare function disconnectHarness(id: string): boolean;
export declare function listAdapters(): {
    kind: import("./types.js").HarnessId;
    label: string;
    binaries: string[];
    notes: string;
    resolved?: string;
    version?: string;
}[];
export { createWorktree, removeWorktree, listWorktrees };
export { inspectPath, inspectMany };
export declare function runOnHarness(input: {
    harnessId: string;
    prompt: string;
    /** Structured context (preferred). Merged with prompt. */
    context?: ContextPack;
    cwd?: string;
    worktreeBranch?: string;
    tag?: string;
    timeoutMs?: number;
    model?: string;
    safer?: boolean;
    /** Run dna.setup after worktree create */
    runSetup?: boolean;
}): Job;
export declare function killJob(jobId: string): boolean;
export declare function killByTag(tag: string): {
    killed: string[];
};
export declare function waitForJob(jobId: string, timeoutMs?: number): Promise<Job>;
/**
 * Fan-out: spawn N jobs. No winner logic.
 */
export declare function fanout(input: {
    prompt: string;
    context?: ContextPack;
    harnessIds: string[];
    useWorktrees?: boolean;
    tag?: string;
    timeoutMs?: number;
    model?: string;
    safer?: boolean;
    runSetup?: boolean;
}): {
    tag: string;
    jobs: Job[];
    errors: string[];
};
export declare function setProjectDna(dna: Partial<ProjectDna>): ProjectDna;
export declare function getJobHandoff(jobId: string): import("./types.js").JobSummary | null;
/** Preview the brief that would be sent (no spawn). */
export declare function previewContext(input: {
    prompt: string;
    context?: ContextPack;
    harnessId?: string;
    cwd?: string;
}): {
    goal: string;
    guidesFound: string[];
    filesIncluded: string[];
    brief: string;
    adapterPromptPreview: string;
};
/** Facts for orchestrator to compare fanout results */
export declare function inspectJobs(opts: {
    tag?: string;
    jobIds?: string[];
}): ReturnType<typeof inspectMany> & {
    jobs: Array<{
        jobId: string;
        harnessId: string;
        status: string;
        path?: string;
    }>;
};
export declare function cleanupTag(tag: string, opts?: {
    killRunning?: boolean;
    removeWorktrees?: boolean;
}): {
    killed: string[];
    removedWorktrees: string[];
    errors: string[];
};
export declare function getJobLog(jobId: string, tail?: number): {
    jobId: string;
    status: JobStatus | undefined;
    logPath: string;
    fromFile: boolean;
    content: string;
};
export declare function listJobsFiltered(opts?: {
    limit?: number;
    tag?: string;
    status?: JobStatus;
    harnessId?: string;
}): Job[];
export declare function snapshot(): {
    role: string;
    note: string;
    projectRoot: string | undefined;
    envCopy: string[];
    dna: ProjectDna;
    harnesses: Harness[];
    jobs: {
        id: string;
        harnessId: string;
        status: JobStatus;
        tag: string | undefined;
        briefPath: string | undefined;
        worktree: string | undefined;
        summary: {
            filesChanged: number | undefined;
            additions: number | undefined;
            deletions: number | undefined;
        } | undefined;
    }[];
    activeJobIds: string[];
    worktrees: string[];
    adapters: {
        kind: import("./types.js").HarnessId;
        label: string;
        binaries: string[];
        notes: string;
        resolved?: string;
        version?: string;
    }[];
    logDir: string;
};
