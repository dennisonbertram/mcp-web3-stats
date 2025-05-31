import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerDefiProtocolInvestigationPrompt(server: McpServer) {
  server.prompt(
  "defi_protocol_investigation",
  "Investigate a DeFi protocol by analyzing its core contracts, TVL, and user activity patterns.",
  {
    protocolName: z.string().describe("The name of the DeFi protocol (e.g., 'Uniswap', 'Aave')"),
    mainContract: z.string().describe("The main protocol contract address"),
    chainId: z.string().describe("The chain ID where the protocol operates")
  },
  ({ protocolName, mainContract, chainId }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Investigate the ${protocolName} DeFi protocol on chain ${chainId}. Main contract: ${mainContract}. I need:
1. Contract verification and security analysis
2. Top users and their activity patterns
3. Token flows and liquidity analysis
4. Recent significant transactions
5. Risk assessment and red flags`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll conduct a comprehensive investigation of ${protocolName} using multiple analysis tools to examine the contract, user patterns, and transaction flows.`
          }
        }
      ]
    };
  }
);
}