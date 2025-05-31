import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callDuneApi } from "../../utils/api.js";

export function registerGetEvmTokenHoldersTool(server: McpServer) {
  server.tool(
  "get_evm_token_holders",
  "Discovers token distribution across ERC20 or ERC721 holders for a given token on a specific EVM chain, ranked by wallet value.",
  {
    chainId: z.union([z.string(), z.number()]).describe("The chain ID (e.g., 1 or '1' for Ethereum)."),
    tokenAddress: z.string().describe("The ERC20 or ERC721 token contract address (e.g., 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)."),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Maximum number of token holders to return.")
    ),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination."),
  },
  async ({ chainId, tokenAddress, limit, offset }) => {
    const path = `/v1/evm/token-holders/${chainId}/${tokenAddress}`;
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