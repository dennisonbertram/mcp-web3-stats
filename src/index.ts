#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import dotenv from "dotenv";

import { VERSION } from "./utils/constants.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";
import { registerAllPrompts } from "./prompts/index.js";
import { startSSEServer } from "./sse-server.js";

// Load environment variables
dotenv.config();

// Check for required environment variables
const DUNE_API_KEY = process.env.DUNE_API_KEY;
if (!DUNE_API_KEY) {
  console.error("FATAL ERROR: DUNE_API_KEY is not set in the environment variables.");
  process.exit(1);
}

// Initialize the MCP server
const server = new McpServer({
  name: "MCPWeb3Stats",
  version: VERSION,
  capabilities: {
    tools: {},
    resources: {},
    prompts: {}
  },
});

// Register all components
registerAllTools(server);
registerAllResources(server);
registerAllPrompts(server);

async function main() {
  // Check for CLI arguments
  const args = process.argv.slice(2);
  
  // Parse transport mode and port
  let transportMode: 'stdio' | 'sse' = 'stdio';
  let port = 3000;
  
  const transportIndex = args.findIndex(arg => arg === '--transport' || arg === '-t');
  if (transportIndex !== -1 && args[transportIndex + 1]) {
    const mode = args[transportIndex + 1].toLowerCase();
    if (mode === 'sse' || mode === 'http') {
      transportMode = 'sse';
    }
  }
  
  const portIndex = args.findIndex(arg => arg === '--port' || arg === '-p');
  if (portIndex !== -1 && args[portIndex + 1]) {
    const parsedPort = parseInt(args[portIndex + 1]);
    if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort < 65536) {
      port = parsedPort;
    }
  }
  
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`MCP Web3 Stats v${VERSION}`);
    process.exit(0);
  }
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
MCP Web3 Stats - Enhanced MCP Server for blockchain data analysis

USAGE:
  mcp-web3-stats [OPTIONS]

OPTIONS:
  -h, --help                Show this help message
  -v, --version             Show version information
  -t, --transport <mode>    Transport mode: 'stdio' (default) or 'sse'/'http'
  -p, --port <number>       Port for SSE transport (default: 3000)

ENVIRONMENT:
  DUNE_API_KEY   Required API key for the Dune API (https://docs.sim.dune.com/)

EXAMPLES:
  # Run in stdio mode (default)
  mcp-web3-stats
  
  # Run in HTTP/SSE mode on port 8080
  mcp-web3-stats --transport sse --port 8080

DESCRIPTION:
  This MCP server provides comprehensive blockchain analysis capabilities by
  combining Dune Analytics API with Blockscout block explorer data. It offers
  40+ tools, multiple resources, and analysis prompts for deep blockchain insights.
    `);
    process.exit(0);
  }

  if (transportMode === 'sse') {
    await startSSEServer(server, port);
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`MCP Web3 Stats v${VERSION} started and listening on stdio.`);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Shutting down server...');
  process.exit(0);
});

main().catch((error) => {
  console.error("Failed to start MCP Web3 Stats Server:", error);
  process.exit(1);
});