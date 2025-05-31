import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerNftCollectionForensicsPrompt(server: McpServer) {
  server.prompt(
  "nft_collection_forensics",
  "Comprehensive analysis of an NFT collection including rarity, trading patterns, and holder behavior.",
  {
    collectionAddress: z.string().describe("The NFT collection contract address"),
    chainId: z.string().describe("The chain ID"),
    includeRarity: z.string().optional().describe("Optional: Include rarity analysis - 'true' or 'false' (default: true)")
  },
  ({ collectionAddress, chainId, includeRarity }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Analyze NFT collection ${collectionAddress} on chain ${chainId}. Include:
1. Collection metadata and verified status
2. Holder distribution and concentration
3. Trading volume and floor price trends
4. Wash trading detection
5. Blue chip holder overlap
${includeRarity !== 'false' ? '6. Rarity distribution analysis' : ''}`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll perform a comprehensive NFT collection analysis including holder patterns, trading activity, and market dynamics.`
          }
        }
      ]
    };
  }
);
}