import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerTokenRiskAssessmentPrompt(server: McpServer) {
  server.prompt(
  "token_risk_assessment",
  "Perform a detailed risk assessment of a token using multi-source analysis.",
  {
    tokenAddress: z.string().describe("The token contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)")
  },
  ({ tokenAddress, chainId }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please perform a comprehensive risk assessment of token ${tokenAddress} on chain ${chainId}. I need to understand:
1. Holder concentration and distribution
2. Recent transfer activity
3. Liquidity and trading volume
4. Any red flags or warnings`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll perform a detailed token analysis using the 'token_deep_analysis' tool for ${tokenAddress} on chain ${chainId}. This will combine real-time transfer data from Blockscout with holder analytics from Dune to provide a comprehensive risk assessment.`
          }
        }
      ]
    };
  }
);
}