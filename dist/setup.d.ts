/** Portable install — works on any machine with network (like other MCPs) */
export declare const NPX_PACKAGE = "github:AJSubrizi/tartarus";
export declare function mcpLaunchNpx(): {
    command: string;
    args: string[];
};
/** Local dist (dev / ./install.sh) */
export declare function mcpLaunchLocal(repoRoot?: string): {
    command: string;
    args: string[];
} | null;
export declare function mcpConfigObject(mode?: "npx" | "local", repoRoot?: string): {
    mcpServers: {
        tartarus: {
            command: string;
            args: string[];
        };
    };
};
export declare function mcpConfigJson(mode?: "npx" | "local", repoRoot?: string): string;
export declare function codexAddCommand(mode?: "npx" | "local"): string;
export declare function setupCodex(opts?: {
    mode?: "npx" | "local";
    dryRun?: boolean;
}): {
    ok: boolean;
    command: string;
    stdout: string;
    stderr: string;
};
export declare function printSetupGuide(): string;
