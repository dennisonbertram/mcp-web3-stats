import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerComprehensiveWalletAnalysisPrompt(server: McpServer) {
  server.prompt(
  "comprehensive_wallet_analysis",
  "Perform a deep analysis of a wallet using both Blockscout and Dune APIs for comprehensive insights.",
  {
    walletAddress: z.string().describe("The wallet address to analyze"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)")
  },
  ({ walletAddress, chainId }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please perform a comprehensive analysis of wallet ${walletAddress} on chain ${chainId}. I need:
1. A behavioral profile of the wallet
2. Current portfolio composition
3. Recent transaction patterns
4. Risk assessment`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll perform a comprehensive analysis using the 'profile_wallet_behavior' tool which combines data from both Blockscout and Dune APIs to give you detailed insights about wallet ${walletAddress} on chain ${chainId}.`
          }
        }
      ]
    };
  }
);
}