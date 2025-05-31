import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerTransactionPostMortemPrompt(server: McpServer) {
  server.prompt(
  "transaction_post_mortem",
  "Analyze a transaction's full impact and context using advanced tools.",
  {
    txHash: z.string().describe("The transaction hash to analyze"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)")
  },
  ({ txHash, chainId }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please analyze transaction ${txHash} on chain ${chainId}. I want to understand:
1. What exactly happened in this transaction
2. All internal transactions and state changes
3. Context about the sender and receiver
4. Overall impact and complexity`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll analyze transaction ${txHash} on chain ${chainId} using the 'analyze_transaction_impact' tool, which provides deep insights by combining Blockscout's detailed traces with Dune's wallet context data.`
          }
        }
      ]
    };
  }
);
}