import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callDuneApi } from "../../utils/api.js";

export function registerGetEvmBalancesTool(server: McpServer) {
  server.tool(
  "get_evm_balances",
  "Fetches EVM token balances for a given wallet address from the Dune API. Supports chain filtering, metadata inclusion, spam filtering, and pagination.",
  {
    walletAddress: z.string().describe("The EVM wallet address (e.g., 0xd8da6bf26964af9d7eed9e03e53415d37aa96045)"),
    chainIds: z.string().optional().describe("Optional. Comma-separated list of chain IDs (e.g., '1,56') or 'all' to fetch balances for specific chains."),
    metadata: z.string().optional().describe("Optional. Comma-separated list of metadata to include (e.g., 'url,logo')."),
    excludeSpamTokens: z.boolean().optional().describe("Optional. Set to true to exclude spam tokens."),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Maximum number of balance items to return for pagination.")
    ),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination for balances."),
  },
  async ({ walletAddress, chainIds, metadata, excludeSpamTokens, limit, offset }) => {
    const path = `/v1/evm/balances/${walletAddress}`;
    const queryParams = new URLSearchParams();
    if (chainIds !== undefined) {
      queryParams.append("chain_ids", chainIds);
    }
    if (metadata !== undefined) {
      queryParams.append("metadata", metadata);
    }
    if (excludeSpamTokens !== undefined) {
      queryParams.append("exclude_spam_tokens", String(excludeSpamTokens));
    }
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