import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";

export function registerBlockscoutAddressTokenBalancesTool(server: McpServer) {
  server.tool(
  "blockscout_address_token_balances",
  "Get all token balances (ERC20, ERC721, ERC1155) for an address from Blockscout.",
  {
    address: z.string().describe("The address to get token balances for"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    type: z.string().optional().describe("Optional. Filter by token type: 'ERC-20' | 'ERC-721' | 'ERC-1155'"),
  },
  async ({ address, chainId, type }) => {
    const path = `/addresses/${address}/tokens`;
    const queryParams = new URLSearchParams();
    
    if (type) queryParams.append("type", type);

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