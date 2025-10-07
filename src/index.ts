#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";

import { VERSION } from "./utils/constants.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";
import { registerAllPrompts } from "./prompts/index.js";
import { startSSEServer } from "./sse-server.js";
import { startStreamableHttpServer } from "./streamable-http-server.js";
import { startHybridHttpServer } from "./hybrid-http-server.js";

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
  let transportMode: 'stdio' | 'http' | 'sse-legacy' | 'hybrid' = 'stdio';
  // Default to Railway's PORT env var if available, otherwise 3000
  let port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  const transportIndex = args.findIndex(arg => arg === '--transport' || arg === '-t');
  if (transportIndex !== -1 && args[transportIndex + 1]) {
    const mode = args[transportIndex + 1].toLowerCase();
    if (mode === 'sse') {
      console.warn('⚠️  "sse" is deprecated. Using modern "http" transport instead.');
      console.warn('   For legacy SSE support, use --transport sse-legacy');
      transportMode = 'http';
    } else if (['http', 'sse-legacy', 'hybrid', 'stdio'].includes(mode)) {
      transportMode = mode as any;
    } else {
      console.error(`Unknown transport mode: ${mode}`);
      console.error('Valid modes: stdio, http, sse-legacy, hybrid');
      process.exit(1);
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
  -t, --transport <mode>    Transport mode: 'stdio' (default), 'http', 'sse-legacy', 'hybrid'
  -p, --port <number>       Port for HTTP transports (default: 3000)

TRANSPORT MODES:
  stdio       Standard input/output (default, for CLI tools)
  http        Modern Streamable HTTP (MCP 2025-03-26, recommended for HTTP)
  sse-legacy  Legacy SSE transport (deprecated, use only for backwards compatibility)
  hybrid      Support both modern and legacy clients

ENVIRONMENT:
  DUNE_API_KEY   Required API key for the Dune API (https://docs.sim.dune.com/)

EXAMPLES:
  # Run in stdio mode (default)
  mcp-web3-stats

  # Run with modern HTTP transport
  mcp-web3-stats --transport http --port 8080

  # Run with hybrid support (modern + legacy)
  mcp-web3-stats --transport hybrid --port 3000

DESCRIPTION:
  This MCP server provides comprehensive blockchain analysis capabilities by
  combining Dune Analytics API with Blockscout block explorer data. It offers
  40+ tools, multiple resources, and analysis prompts for deep blockchain insights.
    `);
    process.exit(0);
  }

  if (transportMode === 'http') {
    await startStreamableHttpServer(server, port);
  } else if (transportMode === 'sse-legacy') {
    console.warn('⚠️  Using deprecated SSE transport (2024-11-05 spec)');
    console.warn('   Please upgrade to --transport http for modern support');
    await startSSEServer(server, port);
  } else if (transportMode === 'hybrid') {
    await startHybridHttpServer(server, port);
  } else {
    // stdio mode (default)
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