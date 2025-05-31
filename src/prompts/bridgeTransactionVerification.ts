import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerBridgeTransactionVerificationPrompt(server: McpServer) {
  server.prompt(
  "bridge_transaction_verification",
  "Verify and analyze cross-chain bridge transactions for security and completion status.",
  {
    bridgeContract: z.string().describe("The bridge contract address"),
    txHash: z.string().optional().describe("Optional: Specific transaction to verify"),
    sourceChain: z.string().describe("Source chain ID"),
    targetChain: z.string().optional().describe("Optional: Target chain ID")
  },
  ({ bridgeContract, txHash, sourceChain, targetChain }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Analyze bridge ${bridgeContract} on chain ${sourceChain}${targetChain ? ` bridging to chain ${targetChain}` : ''}${txHash ? ` for transaction ${txHash}` : ''}. Check:
1. Bridge contract verification and security
2. Recent bridge transactions and success rate
3. Liquidity on both sides
4. Fee structure analysis
5. Known security incidents
${txHash ? '6. Specific transaction status and verification' : '6. Pending/stuck transactions'}`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll analyze the bridge contract and transactions to verify security and operational status.`
          }
        }
      ]
    };
  }
);
}