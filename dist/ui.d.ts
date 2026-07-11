/** Setup GUI — connect subscriptions, install MCP, watch jobs (read-only board). */
export declare function renderUiHtml(opts: {
    bootstrapJson: string;
    port: number;
}): string;
export declare function mcpConfigSnippet(_repoRoot?: string): string;
