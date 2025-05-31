import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerYieldStrategyComparisonPrompt(server: McpServer) {
  server.prompt(
  "yield_strategy_comparison",
  "Compare and analyze DeFi yield strategies across protocols.",
  {
    asset: z.string().describe("The asset to analyze (e.g., 'USDC', 'ETH')"),
    chainId: z.string().describe("The chain ID"),
    minTvl: z.string().optional().describe("Optional: Minimum TVL for protocols to consider")
  },
  ({ asset, chainId, minTvl }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Compare yield strategies for ${asset} on chain ${chainId}${minTvl ? ` with minimum TVL ${minTvl}` : ''}. Analyze:
1. Current yield rates across protocols
2. Risk assessment (smart contract, liquidity, impermanent loss)
3. Gas costs and minimum viable amounts
4. Historical yield stability
5. Composability opportunities
6. Optimal strategy recommendations`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll analyze and compare yield opportunities across DeFi protocols to identify optimal strategies for ${asset}.`
          }
        }
      ]
    };
  }
);
}