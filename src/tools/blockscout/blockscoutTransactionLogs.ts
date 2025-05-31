import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";

export function registerBlockscoutTransactionLogsTool(server: McpServer) {
  server.tool(
  "blockscout_transaction_logs",
  "Get event logs emitted by a transaction from Blockscout.",
  {
    txHash: z.string().describe("The transaction hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ txHash, chainId }) => {
    const path = `/transactions/${txHash}/logs`;

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