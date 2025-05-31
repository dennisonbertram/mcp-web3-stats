import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";

export function registerBlockscoutNftMetadataTool(server: McpServer) {
  server.tool(
  "blockscout_nft_metadata",
  "Get metadata for a specific NFT token ID from Blockscout.",
  {
    address: z.string().describe("The NFT collection contract address"),
    tokenId: z.string().describe("The specific NFT token ID"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ address, tokenId, chainId }) => {
    const path = `/tokens/${address}/instances/${tokenId}`;

    try {
      const data = await callBlockscoutApi(chainId, path);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);
}