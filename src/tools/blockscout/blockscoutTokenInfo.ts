import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";

export function registerBlockscoutTokenInfoTool(server: McpServer) {
  server.tool(
  "blockscout_token_info",
  "Get detailed information about a token including supply, decimals, and metadata from Blockscout.",
  {
    address: z.string().describe("The token contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ address, chainId }) => {
    const path = `/tokens/${address}`;

    try {
      const data = await callBlockscoutApi(chainId, path);
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