import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerAnalyzeErc20TokenPrompt(server: McpServer) {
  server.prompt(
  "analyze_erc20_token",
  "Analyze a specific ERC20 token, showing its information and top 10 holders.", // Description string
  {
    chainId: z.string().describe("The chain ID where the token resides (e.g., '1' for Ethereum). Input as a string."),
    tokenAddress: z.string().describe("The ERC20 token contract address.")
  },
  ({ chainId, tokenAddress }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `I need a detailed analysis of the ERC20 token ${tokenAddress} on chain ${chainId}. Please fetch its token information and list its top 10 holders.`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Understood. I will use 'get_evm_token_info' for chain ${chainId} and token ${tokenAddress} (using chainId ${chainId} for the chain_ids parameter), and then 'get_evm_token_holders' for the same chain and token with a limit of 10. I will then present this information.`
          }
        }
      ]
    };
  }
);
}