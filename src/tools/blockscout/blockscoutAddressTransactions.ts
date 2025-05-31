import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";

export function registerBlockscoutAddressTransactionsTool(server: McpServer) {
  server.tool(
  "blockscout_address_transactions",
  "Get all transactions for an address from Blockscout with filtering and pagination support.",
  {
    address: z.string().describe("The address to get transactions for"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    filter: z.string().optional().describe("Optional. Filter by transaction type: 'from' | 'to' | 'contract_creation'"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of transactions to return (default: 50)")
    ),
    next_page_params: z.string().optional().describe("Optional. Pagination cursor from previous response"),
  },
  async ({ address, chainId, filter, limit, next_page_params }) => {
    const path = `/addresses/${address}/transactions`;
    const queryParams = new URLSearchParams();
    
    if (filter) queryParams.append("filter", filter);
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