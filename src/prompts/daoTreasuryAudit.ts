import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerDaoTreasuryAuditPrompt(server: McpServer) {
  server.prompt(
  "dao_treasury_audit",
  "Comprehensive audit of a DAO treasury including assets, spending, and governance.",
  {
    treasuryAddress: z.string().describe("The DAO treasury address"),
    chainId: z.string().describe("The chain ID"),
    governanceContract: z.string().optional().describe("Optional: Governance contract address")
  },
  ({ treasuryAddress, chainId, governanceContract }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Audit DAO treasury ${treasuryAddress} on chain ${chainId}${governanceContract ? ` with governance ${governanceContract}` : ''}. Analyze:
1. Current asset composition and diversification
2. Inflow/outflow patterns and burn rate
3. Large transactions and approval process
4. Yield generation strategies
5. Risk assessment (concentration, liquidity)
6. Governance participation and proposal history`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll conduct a comprehensive treasury audit analyzing assets, spending patterns, and governance effectiveness.`
          }
        }
      ]
    };
  }
);
}