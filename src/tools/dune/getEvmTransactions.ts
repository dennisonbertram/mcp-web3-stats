import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callDuneApi } from "../../utils/api.js";

export function registerGetEvmTransactionsTool(server: McpServer) {
  server.tool(
  "get_evm_transactions",
  "Retrieves granular EVM transaction details for a given wallet address from the Dune API.",
  {
    walletAddress: z.string().describe("The EVM wallet address (e.g., 0xd8da6bf26964af9d7eed9e03e53415d37aa96045)"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Maximum number of transactions to return.")
    ),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination, taken from 'next_offset' of a previous response."),
    // TODO: Add other potential filter parameters like start_block_time, end_block_time if supported by API and useful
  },
  async ({ walletAddress, limit, offset }) => {
    const path = `/v1/evm/transactions/${walletAddress}`;
    const queryParams = new URLSearchParams();

    if (limit !== undefined) {
      queryParams.append("limit", String(limit));
    }
    if (offset !== undefined) {
      queryParams.append("offset", offset);
    }

    try {
      const data = await callDuneApi(path, queryParams);
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
        content: [
          {
            type: "text",
            text: error.message,
          },
        ],
      };
    }
  }
);
}