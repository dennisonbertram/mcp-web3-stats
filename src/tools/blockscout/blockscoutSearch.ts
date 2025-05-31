import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";

export function registerBlockscoutSearchTool(server: McpServer) {
  server.tool(
  "blockscout_search",
  "Search across addresses, tokens, blocks, and transactions on a specific blockchain using Blockscout.",
  {
    query: z.string().describe("The search query (address, tx hash, block number, token name, etc.)"),
    chainId: z.string().describe("The chain ID to search on (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ query, chainId }) => {
    const path = "/search";
    const queryParams = new URLSearchParams();
    queryParams.append("q", query);

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