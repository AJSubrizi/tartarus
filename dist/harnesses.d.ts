import { type ChildProcess } from "node:child_process";
import type { Harness, HarnessId } from "./types.js";
import { type BuiltRun } from "./adapters.js";
export declare const DEFAULT_HARNESSES: Harness[];
export declare function which(bin: string): string | null;
export declare function probeHarness(h: Harness): Harness;
export declare function probeAll(harnesses: Harness[]): Harness[];
export declare function buildRun(kind: HarnessId, opts: {
    prompt: string;
    cwd: string;
    baseArgs: string[];
    model?: string;
    safer?: boolean;
}): BuiltRun;
export interface RunHandle {
    pid: number;
    child: ChildProcess;
    kill: (signal?: NodeJS.Signals) => void;
}
export declare function spawnHarness(opts: {
    command: string;
    args: string[];
    cwd?: string;
    env?: Record<string, string>;
    onData: (chunk: string) => void;
    onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
}): RunHandle;
export declare function formatCommandLine(command: string, args: string[]): string;
