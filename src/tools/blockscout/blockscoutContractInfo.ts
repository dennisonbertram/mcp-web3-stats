import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";

export function registerBlockscoutContractInfoTool(server: McpServer) {
  server.tool(
  "blockscout_contract_info",
  "Get verified smart contract details including source code, ABI, and metadata from Blockscout.",
  {
    address: z.string().describe("The contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ address, chainId }) => {
    const path = `/smart-contracts/${address}`;

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