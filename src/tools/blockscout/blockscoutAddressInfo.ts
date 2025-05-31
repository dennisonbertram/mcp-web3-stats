import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";

export function registerBlockscoutAddressInfoTool(server: McpServer) {
  server.tool(
  "blockscout_address_info",
  "Get detailed information about an address including balance, type (EOA/contract), and basic stats from Blockscout.",
  {
    address: z.string().describe("The address to get information for"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ address, chainId }) => {
    const path = `/addresses/${address}`;

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