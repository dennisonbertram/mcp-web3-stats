import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerCompareNetworksPrompt(server: McpServer) {
  server.prompt(
  "compare_networks",
  "Compare supported networks and their API capabilities.",
  {},
  () => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Show me all supported blockchain networks and compare which APIs (Dune vs Blockscout) are available for each chain.`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll fetch the unified network support information that shows all supported chains and their API availability across both Dune and Blockscout.`
          }
        }
      ]
    };
  }
);
}