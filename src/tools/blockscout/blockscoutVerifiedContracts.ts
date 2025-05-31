import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";

export function registerBlockscoutVerifiedContractsTool(server: McpServer) {
  server.tool(
  "blockscout_verified_contracts",
  "Get a list of recently verified smart contracts from Blockscout.",
  {
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    filter: z.string().optional().describe("Optional. Filter by verification type: 'solidity' | 'vyper' | 'yul'"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of contracts to return (default: 50)")
    ),
  },
  async ({ chainId, filter, limit }) => {
    const path = "/smart-contracts";
    const queryParams = new URLSearchParams();
    
    if (filter) queryParams.append("filter", filter);
    if (limit) queryParams.append("items_count", String(limit));

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