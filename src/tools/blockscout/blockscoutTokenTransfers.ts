import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";

export function registerBlockscoutTokenTransfersTool(server: McpServer) {
  server.tool(
  "blockscout_token_transfers",
  "Get token transfer history for a specific token from Blockscout.",
  {
    address: z.string().describe("The token contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of transfers to return (default: 50)")
    ),
    next_page_params: z.string().optional().describe("Optional. Pagination cursor from previous response"),
  },
  async ({ address, chainId, limit, next_page_params }) => {
    const path = `/tokens/${address}/transfers`;
    const queryParams = new URLSearchParams();
    
    if (limit) queryParams.append("items_count", String(limit));
    if (next_page_params) queryParams.append("next_page_params", next_page_params);

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