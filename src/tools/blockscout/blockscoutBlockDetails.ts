import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";

export function registerBlockscoutBlockDetailsTool(server: McpServer) {
  server.tool(
  "blockscout_block_details",
  "Get comprehensive information about a specific block from Blockscout.",
  {
    blockNumber: z.string().describe("The block number or hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ blockNumber, chainId }) => {
    const path = `/blocks/${blockNumber}`;

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