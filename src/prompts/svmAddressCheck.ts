import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerSvmAddressCheckPrompt(server: McpServer) {
  server.prompt(
  "svm_address_check",
  "Check basic information for an SVM address, including balances and its 3 most recent transactions.",
  {
    walletAddress: z.string().describe("The SVM wallet address to check.")
  },
  ({ walletAddress }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please provide a quick check for the SVM address ${walletAddress}. Show me its token balances (for Solana by default) and its 3 most recent transactions.`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Okay, I will use 'get_svm_balances' (defaulting to Solana chain) and 'get_svm_transactions' (with a limit of 3) for the address ${walletAddress} and summarize the results.`
          }
        }
      ]
    };
  }
);
}