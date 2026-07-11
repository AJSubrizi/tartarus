import type { HarnessId } from "./types.js";
export interface RunBuildInput {
    prompt: string;
    cwd: string;
    baseArgs: string[];
    /** Extra model if the CLI supports it */
    model?: string;
    /** Prefer safer sandbox when available (still non-interactive) */
    safer?: boolean;
}
export interface BuiltRun {
    args: string[];
    env: Record<string, string>;
    /** Human-readable spawn summary */
    summary: string;
    /** Prompt may be written to a file for long inputs */
    promptFile?: string;
}
export interface Adapter {
    kind: HarnessId;
    /** Binaries to try, first match wins */
    binaries: string[];
    label: string;
    /** Probe version / health */
    versionArgs: string[];
    build(input: RunBuildInput): BuiltRun;
    notes: string;
}
/** ARG_MAX safe-ish: write long prompts to a temp file when needed */
export declare function maybePromptFile(prompt: string, prefix: string): {
    prompt: string;
    file?: string;
    useFile: boolean;
};
export declare const ADAPTERS: Record<HarnessId, Adapter>;
export declare function resolveBinary(kind: HarnessId, preferredCommand?: string): {
    command: string;
    path: string;
} | {
    error: string;
};
export declare function probeVersion(command: string, versionArgs: string[]): string | undefined;
export declare function buildHarnessRun(kind: HarnessId, input: RunBuildInput): BuiltRun;
export declare function adapterCatalog(): Array<{
    kind: HarnessId;
    label: string;
    binaries: string[];
    notes: string;
    resolved?: string;
    version?: string;
}>;
