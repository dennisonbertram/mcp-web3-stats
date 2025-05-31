import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callDuneApi } from "../../utils/api.js";

export function registerGetSvmBalancesTool(server: McpServer) {
  server.tool(
  "get_svm_balances",
  "Fetches token balances (native, SPL, SPL-2022) for a given SVM wallet address from the Dune API.",
  {
    walletAddress: z.string().describe("The SVM wallet address (e.g., a Solana or Eclipse address)."),
    chains: z.string().optional().describe("Optional. Comma-separated list of chains (e.g., 'solana,eclipse') or 'all'. Defaults to fetching for all supported SVM chains if not specified."),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Maximum number of balance items to return.")
    ),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination."),
  },
  async ({ walletAddress, chains, limit, offset }) => {
    const path = `/beta/svm/balances/${walletAddress}`;
    const queryParams = new URLSearchParams();

    if (chains !== undefined) {
      queryParams.append("chains", chains);
    }
    if (limit !== undefined) {
      queryParams.append("limit", String(limit));
    }
    if (offset !== undefined) {
      queryParams.append("offset", offset);
    }

    try {
      const data = await callDuneApi(path, queryParams);
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
        content: [
          {
            type: "text",
            text: error.message,
          },
        ],
      };
    }
  }
);
}