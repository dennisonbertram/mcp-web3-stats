import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";

export function registerBlockscoutBlockTransactionsTool(server: McpServer) {
  server.tool(
  "blockscout_block_transactions",
  "Get all transactions included in a specific block from Blockscout.",
  {
    blockNumber: z.string().describe("The block number or hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of transactions to return (default: 50)")
    ),
  },
  async ({ blockNumber, chainId, limit }) => {
    const path = `/blocks/${blockNumber}/transactions`;
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