import type { Harness, Job, ProjectDna, TartarusState } from "./types.js";
export declare function loadState(): TartarusState;
export declare function saveState(state: TartarusState): void;
export declare function statePath(): string;
export declare class Store {
    state: TartarusState;
    constructor();
    persist(): void;
    listHarnesses(): Harness[];
    getHarness(id: string): Harness | undefined;
    upsertHarness(h: Harness): Harness;
    removeHarness(id: string): boolean;
    addJob(job: Job): Job;
    updateJob(id: string, patch: Partial<Job>): Job | undefined;
    getJob(id: string): Job | undefined;
    listJobs(limit?: number): Job[];
    setProjectRoot(path: string): void;
    setEnvCopy(files: string[]): void;
    setDna(dna: Partial<ProjectDna>): ProjectDna;
}
export declare const store: Store;
