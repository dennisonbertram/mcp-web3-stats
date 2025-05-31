import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";

export function registerBlockscoutTransactionRawTraceTool(server: McpServer) {
  server.tool(
  "blockscout_transaction_raw_trace",
  "Get the raw execution trace of a transaction from Blockscout (useful for debugging).",
  {
    txHash: z.string().describe("The transaction hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ txHash, chainId }) => {
    const path = `/transactions/${txHash}/raw-trace`;

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