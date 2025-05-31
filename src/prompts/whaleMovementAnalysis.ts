import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerWhaleMovementAnalysisPrompt(server: McpServer) {
  server.prompt(
  "whale_movement_analysis",
  "Track and analyze large holder (whale) movements for a specific token or protocol.",
  {
    tokenAddress: z.string().describe("The token contract address to monitor"),
    chainId: z.string().describe("The chain ID"),
    threshold: z.string().optional().describe("Optional: Minimum USD value to consider as whale activity (default: $100,000)")
  },
  ({ tokenAddress, chainId, threshold }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Track whale movements for token ${tokenAddress} on chain ${chainId}${threshold ? ` with threshold ${threshold}` : ''}. Analyze:
1. Large holder list and concentration changes
2. Recent significant transfers (in/out)
3. Accumulation or distribution patterns
4. Correlation with price movements
5. Cross-protocol activity by whales`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll analyze whale activity and large holder movements to identify accumulation/distribution patterns and their market impact.`
          }
        }
      ]
    };
  }
);
}