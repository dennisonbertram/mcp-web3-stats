import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPingDuneServerTool(server: McpServer) {
  server.tool(
  "ping_dune_server",
  "A simple tool to check if the Dune MCP server is responsive.",
  {},
  async () => {
    return {
      content: [{ type: "text", text: "Pong! Dune MCP server is active." }],
    };
  }
);
}