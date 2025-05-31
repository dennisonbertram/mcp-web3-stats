import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";

export function registerBlockscoutReadContractTool(server: McpServer) {
  server.tool(
  "blockscout_read_contract",
  "Call a read method on a verified smart contract and get the result from Blockscout.",
  {
    address: z.string().describe("The contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    method: z.string().describe("The method name to call"),
    args: z.array(z.any()).optional().describe("Optional. Array of arguments to pass to the method"),
  },
  async ({ address, chainId, method, args }) => {
    const path = `/smart-contracts/${address}/query-read-method`;
    const queryParams = new URLSearchParams();
    
    queryParams.append("method_id", method);
    if (args && args.length > 0) {
      args.forEach((arg, index) => {
        queryParams.append(`args[${index}]`, String(arg));
      });
    }

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