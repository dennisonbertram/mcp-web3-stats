import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callDuneApi } from "../../utils/api.js";
import { callBlockscoutApi } from "../../utils/api.js";
import { BLOCKSCOUT_NETWORKS } from "../../utils/constants.js";

export function registerAnalyzeTransactionImpactTool(server: McpServer) {
  server.tool(
  "analyze_transaction_impact",
  "Deep dive into a transaction's full impact by combining Blockscout's detailed traces with Dune's wallet context.",
  {
    txHash: z.string().describe("The transaction hash to analyze"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ txHash, chainId }) => {
    try {
      // First get transaction details from Blockscout
      const txDetails: any = await callBlockscoutApi(chainId, `/transactions/${txHash}`);
      
      // Fetch additional transaction data in parallel
      const [txLogs, txInternalTxs, txStateChanges, senderActivity, receiverActivity] = await Promise.all([
        // Get logs from Blockscout
        callBlockscoutApi(chainId, `/transactions/${txHash}/logs`).catch(err => ({ error: err.message })),
        // Get internal transactions
        callBlockscoutApi(chainId, `/transactions/${txHash}/internal-transactions`).catch(err => ({ error: err.message })),
        // Get state changes
        callBlockscoutApi(chainId, `/transactions/${txHash}/state-changes`).catch(err => ({ error: err.message })),
        // Get sender's recent activity from Dune
        txDetails.from?.hash ? 
          callDuneApi(`/v1/evm/activity/${txDetails.from.hash}`, new URLSearchParams({ limit: "5" }))
            .catch(err => ({ error: err.message })) : null,
        // Get receiver's recent activity from Dune (if not a contract creation)
        txDetails.to?.hash && !txDetails.to.is_contract ? 
          callDuneApi(`/v1/evm/activity/${txDetails.to.hash}`, new URLSearchParams({ limit: "5" }))
            .catch(err => ({ error: err.message })) : null,
      ]);

      // Analyze the impact
      const impact = {
        transaction: {
          hash: txHash,
          chainId: chainId,
          network: BLOCKSCOUT_NETWORKS[chainId]?.name || `Chain ${chainId}`,
          status: txDetails.status,
          timestamp: txDetails.timestamp,
          blockNumber: txDetails.block,
        },
        participants: {
          from: {
            address: txDetails.from?.hash,
            isContract: txDetails.from?.is_contract,
            recentActivity: senderActivity,
          },
          to: {
            address: txDetails.to?.hash,
            isContract: txDetails.to?.is_contract,
            recentActivity: receiverActivity,
          },
        },
        execution: {
          gasUsed: txDetails.gas_used,
          gasPrice: txDetails.gas_price,
          value: txDetails.value,
          fee: txDetails.fee?.value,
        },
        effects: {
          logs: txLogs,
          internalTransactions: txInternalTxs,
          stateChanges: txStateChanges,
          tokenTransfers: txDetails.token_transfers,
        },
        analysis: {
          complexity: (txInternalTxs as any)?.items?.length > 0 ? "complex" : "simple",
          hasTokenTransfers: txDetails.token_transfers?.length > 0,
          hasStateChanges: (txStateChanges as any)?.items?.length > 0,
          eventCount: (txLogs as any)?.items?.length || 0,
        }
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(impact, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error analyzing transaction: ${error.message}` }],
      };
    }
  }
);
}