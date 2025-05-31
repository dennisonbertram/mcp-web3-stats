#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";

import { VERSION } from "./utils/constants.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";
import { registerAllPrompts } from "./prompts/index.js";

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
  -h, --help     Show this help message
  -v, --version  Show version information

ENVIRONMENT:
  DUNE_API_KEY   Required API key for the Dune API (https://docs.sim.dune.com/)

DESCRIPTION:
  This MCP server provides comprehensive blockchain analysis capabilities by
  combining Dune Analytics API with Blockscout block explorer data. It offers
  40+ tools, multiple resources, and analysis prompts for deep blockchain insights.
    `);
    process.exit(0);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`MCP Web3 Stats v${VERSION} started and listening on stdio.`);
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