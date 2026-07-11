export type HostId = "claude" | "codex" | "cursor";
export interface HostInfo {
    id: HostId;
    label: string;
    description: string;
    /** CLI on PATH or app present */
    installed: boolean;
    /** Tartarus MCP already registered */
    mcpInstalled: boolean;
    detail?: string;
    installHint?: string;
}
export declare function listHosts(): HostInfo[];
export declare function installHostMcp(host: HostId, opts?: {
    preferLocal?: boolean;
}): {
    ok: boolean;
    message: string;
    host: HostId;
};
export declare function uninstallHostMcp(host: HostId): {
    ok: boolean;
    message: string;
    host: HostId;
};
export declare function dashboardState(): {
    hosts: HostInfo[];
    mcpSnippet: string;
    npxPackage: string;
};
