import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callDuneApi } from "../../utils/api.js";

export function registerGetSvmTransactionsTool(server: McpServer) {
  server.tool(
  "get_svm_transactions",
  "Fetches transactions for a given SVM wallet address (currently Solana only) from the Dune API.",
  {
    walletAddress: z.string().describe("The SVM wallet address (e.g., a Solana address)."),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Maximum number of transactions to return.")
    ),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination."),
  },
  async ({ walletAddress, limit, offset }) => {
    const path = `/beta/svm/transactions/${walletAddress}`;
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