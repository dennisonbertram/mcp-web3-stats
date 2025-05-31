import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callDuneApi } from "../../utils/api.js";

export function registerGetEvmActivityTool(server: McpServer) {
  server.tool(
  "get_evm_activity",
  "Fetches EVM account activity for a given wallet address from the Dune API. Supports spam filtering and pagination.",
  {
    walletAddress: z.string().describe("The EVM wallet address (e.g., 0xd8da6bf26964af9d7eed9e03e53415d37aa96045)"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of activity items to return. Defaults to 25 if not specified by API.")
    ),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination, from a previous 'next_offset' response."),
    excludeSpamTokens: z.boolean().optional().describe("Optional. Set to true to exclude activities related to spam tokens."),
  },
  async ({ walletAddress, limit, offset, excludeSpamTokens }) => {
    const path = `/v1/evm/activity/${walletAddress}`;
    const queryParams = new URLSearchParams();
    if (limit !== undefined) {
      queryParams.append("limit", String(limit));
    }
    if (offset !== undefined) {
      queryParams.append("offset", offset);
    }
    if (excludeSpamTokens !== undefined) {
      queryParams.append("exclude_spam_tokens", String(excludeSpamTokens));
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