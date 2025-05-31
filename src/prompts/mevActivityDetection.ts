import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerMevActivityDetectionPrompt(server: McpServer) {
  server.prompt(
  "mev_activity_detection",
  "Detect and analyze MEV (Maximum Extractable Value) activity including sandwich attacks and arbitrage.",
  {
    targetAddress: z.string().optional().describe("Optional: Specific address or contract to monitor"),
    chainId: z.string().describe("The chain ID"),
    blockRange: z.string().optional().describe("Optional: Block range to analyze (e.g., 'latest-100')")
  },
  ({ targetAddress, chainId, blockRange }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Detect MEV activity on chain ${chainId}${targetAddress ? ` involving ${targetAddress}` : ''}${blockRange ? ` in blocks ${blockRange}` : ' in recent blocks'}. Identify:
1. Sandwich attacks (front-run + back-run patterns)
2. Arbitrage transactions across DEXes
3. Liquidation races
4. NFT MEV (trait sniping, floor sweeping)
5. MEV bot identification and profit analysis`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll scan for MEV patterns including sandwich attacks, arbitrage, and other extractable value activities.`
          }
        }
      ]
    };
  }
);
}