import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";

export function registerBlockscoutLatestBlocksTool(server: McpServer) {
  server.tool(
  "blockscout_latest_blocks",
  "Get the most recent blocks from the blockchain via Blockscout.",
  {
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of blocks to return (default: 50)")
    ),
  },
  async ({ chainId, limit }) => {
    const path = "/blocks";
    const queryParams = new URLSearchParams();
    
    if (limit) queryParams.append("items_count", String(limit));

    try {
      const data = await callBlockscoutApi(chainId, path, queryParams);
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