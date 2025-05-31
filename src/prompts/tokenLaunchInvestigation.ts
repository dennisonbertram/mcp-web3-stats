import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerTokenLaunchInvestigationPrompt(server: McpServer) {
  server.prompt(
  "token_launch_investigation",
  "Perform forensic analysis on a newly launched token to identify potential risks or scams.",
  {
    tokenAddress: z.string().describe("The token contract address"),
    chainId: z.string().describe("The chain ID"),
    launchDate: z.string().optional().describe("Optional: The token launch date (YYYY-MM-DD)")
  },
  ({ tokenAddress, chainId, launchDate }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Perform a forensic investigation of token ${tokenAddress} on chain ${chainId}${launchDate ? ` launched on ${launchDate}` : ''}. Check for:
1. Contract code red flags (minting, pause, blacklist functions)
2. Initial distribution and holder concentration
3. Liquidity pool analysis and locks
4. Developer wallet activity
5. Similar contract deployments by same deployer
6. Social engineering indicators`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll perform a comprehensive forensic analysis to identify any potential risks or scam indicators for this token launch.`
          }
        }
      ]
    };
  }
);
}