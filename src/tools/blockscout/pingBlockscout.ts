import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callBlockscoutApi } from "../../utils/api.js";
import { BLOCKSCOUT_NETWORKS } from "../../utils/constants.js";

export function registerPingBlockscoutTool(server: McpServer) {
  server.tool(
  "ping_blockscout",
  "Test connectivity to a Blockscout instance for a specific chain.",
  {
    chainId: z.string().describe("The chain ID to test (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ chainId }) => {
    try {
      const network = BLOCKSCOUT_NETWORKS[chainId];
      if (!network) {
        return {
          content: [{ 
            type: "text", 
            text: `Unsupported chain ID: ${chainId}. Supported chains: ${Object.keys(BLOCKSCOUT_NETWORKS).join(", ")}` 
          }],
        };
      }
      
      const data = await callBlockscoutApi(chainId, "/stats");
      return {
        content: [{ 
          type: "text", 
          text: `✓ Blockscout ${network.name} (chain ${chainId}) is active. Network stats: ${JSON.stringify(data, null, 2)}` 
        }],
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