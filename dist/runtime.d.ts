import { createWorktree, listWorktrees, removeWorktree } from "./worktree.js";
import { inspectMany, inspectPath } from "./inspect.js";
import type { Harness, Job, JobStatus } from "./types.js";
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
    cwd?: string;
    worktreeBranch?: string;
    tag?: string;
    timeoutMs?: number;
    model?: string;
    safer?: boolean;
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
    harnessIds: string[];
    useWorktrees?: boolean;
    tag?: string;
    timeoutMs?: number;
    model?: string;
    safer?: boolean;
}): {
    tag: string;
    jobs: Job[];
    errors: string[];
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
    harnesses: Harness[];
    jobs: Job[];
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
