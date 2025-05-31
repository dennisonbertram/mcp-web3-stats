import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerGasOptimizationAuditPrompt(server: McpServer) {
  server.prompt(
  "gas_optimization_audit",
  "Analyze gas usage patterns and identify optimization opportunities for contracts or users.",
  {
    address: z.string().describe("Contract or wallet address to analyze"),
    chainId: z.string().describe("The chain ID"),
    timeframe: z.string().optional().describe("Optional: Analysis timeframe (e.g., '7d', '30d')")
  },
  ({ address, chainId, timeframe }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Perform gas optimization analysis for ${address} on chain ${chainId}${timeframe ? ` over ${timeframe}` : ''}. Analyze:
1. Gas consumption by function/transaction type
2. Comparison with similar contracts/users
3. Peak vs off-peak usage patterns
4. Failed transaction gas waste
5. Specific optimization recommendations
6. Estimated savings potential`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll analyze gas usage patterns and identify specific optimization opportunities to reduce transaction costs.`
          }
        }
      ]
    };
  }
);
}