/**
 * Tartarus MCP — tools for the MAIN harness (the orchestrator).
 * Tartarus only runs primitives with solid CLI adapters.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export declare function createMcpServer(): McpServer;
export declare function runMcpStdio(): Promise<void>;
