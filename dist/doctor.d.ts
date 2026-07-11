export declare const VERSION = "0.7.3";
export declare function doctorReport(repoRoot?: string): {
    ok: boolean;
    version: string;
    role: string;
    checks: {
        name: string;
        ok: boolean;
        detail: string;
    }[];
    ready: {
        id: string;
        command: string;
        version: string | undefined;
    }[];
    missing: {
        id: string;
        command: string;
        error: string | undefined;
    }[];
    adapters: import("./types.js").HarnessId[];
    worktrees: string[];
    mcp: {
        recommended: {
            command: string;
            args: string[];
        };
        local: {
            command: string;
            args: string[];
        };
        codexOneLiner: string;
    };
};
/** @deprecated use setup.mcpConfigJson */
export declare function mcpConfigJson(cliPath: string): string;
