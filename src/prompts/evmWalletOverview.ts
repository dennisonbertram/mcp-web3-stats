import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerEvmWalletOverviewPrompt(server: McpServer) {
  server.prompt(
    "evm_wallet_overview",
    {
      walletAddress: z.string().describe("The EVM wallet address to get an overview for.")
    },
    ({ walletAddress }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please provide an overview for EVM wallet ${walletAddress}. I'm interested in its current token balances and a summary of its 5 most recent activities. Present the balances first, then the activity summary.`
            }
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: `Okay, I will use the 'get_evm_balances' tool to fetch token balances and the 'get_evm_activity' tool (with a limit of 5) to get recent activity for ${walletAddress}. Then I will summarize the findings.`
            }
          }
        ]
      };
    }
  );
}