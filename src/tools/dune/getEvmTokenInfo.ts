import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callDuneApi } from "../../utils/api.js";

export function registerGetEvmTokenInfoTool(server: McpServer) {
  server.tool(
  "get_evm_token_info",
  "Fetches detailed metadata and real-time price information for a native asset or ERC20 token on EVM chains from the Dune API.",
  {
    chainAndTokenUri: z.string().describe("The URI path segment for the token, e.g., '1/0xTOKEN_ADDRESS' for an ERC20 token on Ethereum (chain_id 1), or '1/native' for Ethereum's native token."),
    chainIds: z.string().describe("Mandatory. Comma-separated list of chain IDs (e.g., '1,56') or 'all' to fetch tokens for all supported chains."),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Maximum number of items to return.")
    ),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination."),
  },
  async ({ chainAndTokenUri, chainIds, limit, offset }) => {
    const path = `/v1/evm/token-info/${chainAndTokenUri}`;
    const queryParams = new URLSearchParams();

    queryParams.append("chain_ids", chainIds); // Mandatory parameter

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