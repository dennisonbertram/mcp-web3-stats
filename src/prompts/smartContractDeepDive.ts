import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerSmartContractDeepDivePrompt(server: McpServer) {
  server.prompt(
  "smart_contract_deep_dive",
  "Investigate a smart contract thoroughly using combined Blockscout and Dune data.",
  {
    contractAddress: z.string().describe("The smart contract address to investigate"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)")
  },
  ({ contractAddress, chainId }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `I need a thorough investigation of smart contract ${contractAddress} on chain ${chainId}. Please provide:
1. Contract verification status and source code availability
2. Available read/write methods
3. Token metrics if applicable
4. Recent usage patterns`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll investigate smart contract ${contractAddress} on chain ${chainId} using the 'investigate_smart_contract' tool, which combines real-time Blockscout data with Dune analytics to provide comprehensive contract analysis.`
          }
        }
      ]
    };
  }
);
}