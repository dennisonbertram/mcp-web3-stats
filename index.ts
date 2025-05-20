import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const DUNE_API_KEY = process.env.DUNE_API_KEY;

if (!DUNE_API_KEY) {
  console.error("FATAL ERROR: DUNE_API_KEY is not set in the environment variables.");
  process.exit(1);
}

const server = new McpServer({
  name: "DuneAPIAnalyzer",
  version: "0.1.0",
  capabilities: {
    tools: {},
    resources: {},
    prompts: {}
  },
});

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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Dune API MCP Server (Stdio) started and listening."); // Log to stderr for stdio transport
}

main().catch((error) => {
  console.error("Failed to start Dune API MCP Server:", error);
  process.exit(1);
});