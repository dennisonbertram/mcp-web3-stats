import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";

export function registerBlockscoutContractMethodsTool(server: McpServer) {
  server.tool(
  "blockscout_contract_methods",
  "Get readable and writable methods of a verified smart contract from Blockscout.",
  {
    address: z.string().describe("The contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ address, chainId }) => {
    const path = `/smart-contracts/${address}/methods-read`;

    try {
      const readMethods = await callBlockscoutApi(chainId, path);
      const writeMethods = await callBlockscoutApi(chainId, `/smart-contracts/${address}/methods-write`);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ readMethods, writeMethods }, null, 2),
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