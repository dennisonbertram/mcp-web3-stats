import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callDuneApi } from "../../utils/api.js";
import { callBlockscoutApi } from "../../utils/api.js";
import { BLOCKSCOUT_NETWORKS } from "../../utils/constants.js";
import { determineWalletType, determinePrimaryUse } from "../../utils/helpers.js";

export function registerProfileWalletBehaviorTool(server: McpServer) {
  server.tool(
  "profile_wallet_behavior",
  "Create a comprehensive behavioral profile of a wallet by combining real-time activity from Blockscout with historical patterns from Dune.",
  {
    walletAddress: z.string().describe("The wallet address to profile"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ walletAddress, chainId }) => {
    try {
      // Fetch comprehensive wallet data from both sources
      const [
        blockscoutInfo,
        blockscoutTxs,
        blockscoutTokens,
        blockscoutInternalTxs,
        duneBalances,
        duneActivity
      ] = await Promise.all([
        // Blockscout data
        callBlockscoutApi(chainId, `/addresses/${walletAddress}`).catch(err => ({ error: err.message })),
        callBlockscoutApi(chainId, `/addresses/${walletAddress}/transactions`, new URLSearchParams({ items_count: "20" }))
          .catch(err => ({ error: err.message })),
        callBlockscoutApi(chainId, `/addresses/${walletAddress}/tokens`).catch(err => ({ error: err.message })),
        callBlockscoutApi(chainId, `/addresses/${walletAddress}/internal-transactions`, new URLSearchParams({ items_count: "10" }))
          .catch(err => ({ error: err.message })),
        // Dune data
        callDuneApi(`/v1/evm/balances/${walletAddress}`, new URLSearchParams({ chain_ids: chainId }))
          .catch(err => ({ error: err.message })),
        callDuneApi(`/v1/evm/activity/${walletAddress}`, new URLSearchParams({ limit: "20" }))
          .catch(err => ({ error: err.message }))
      ]) as [any, any, any, any, any, any];

      // Analyze transaction patterns
      const txPatterns = {
        totalTransactions: blockscoutInfo?.transaction_count || 0,
        contractInteractions: 0,
        uniqueContracts: new Set(),
        transfersIn: 0,
        transfersOut: 0,
      };

      if (blockscoutTxs?.items) {
        blockscoutTxs.items.forEach((tx: any) => {
          if (tx.to?.is_contract) {
            txPatterns.contractInteractions++;
            txPatterns.uniqueContracts.add(tx.to.hash);
          }
          if (tx.from?.hash?.toLowerCase() === walletAddress.toLowerCase()) {
            txPatterns.transfersOut++;
          } else {
            txPatterns.transfersIn++;
          }
        });
      }

      // Analyze token portfolio
      const portfolio = {
        nativeBalance: blockscoutInfo?.coin_balance,
        tokenCount: 0,
        nftCount: 0,
        defiTokens: 0,
        stablecoins: 0,
      };

      if (duneBalances?.items) {
        duneBalances.items.forEach((token: any) => {
          portfolio.tokenCount++;
          if (token.token_type === "ERC721" || token.token_type === "ERC1155") {
            portfolio.nftCount++;
          }
          // Check for stablecoins
          if (["USDC", "USDT", "DAI", "BUSD"].includes(token.symbol?.toUpperCase())) {
            portfolio.stablecoins++;
          }
          // Simple DeFi token detection
          if (token.symbol?.toLowerCase().includes("lp") || 
              token.name?.toLowerCase().includes("liquidity") ||
              token.name?.toLowerCase().includes("vault")) {
            portfolio.defiTokens++;
          }
        });
      }

      // Create behavioral profile
      const profile = {
        wallet: {
          address: walletAddress,
          chainId: chainId,
          network: BLOCKSCOUT_NETWORKS[chainId]?.name || `Chain ${chainId}`,
          ens: blockscoutInfo?.ens_domain_name,
          createdAt: blockscoutInfo?.creation_transaction_hash ? "tracked" : "unknown",
        },
        activity: {
          firstSeen: blockscoutInfo?.creation_transaction_hash,
          totalTransactions: txPatterns.totalTransactions,
          contractInteractions: txPatterns.contractInteractions,
          uniqueContractsUsed: txPatterns.uniqueContracts.size,
          recentTransactions: blockscoutTxs,
          internalTransactions: blockscoutInternalTxs,
        },
        portfolio: portfolio,
        behavior: {
          type: determineWalletType(txPatterns, portfolio),
          activityLevel: txPatterns.totalTransactions > 1000 ? "high" : 
                        txPatterns.totalTransactions > 100 ? "medium" : "low",
          primaryUse: determinePrimaryUse(txPatterns, portfolio),
        },
        duneMetrics: {
          balances: duneBalances,
          recentActivity: duneActivity,
        }
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(profile, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error profiling wallet: ${error.message}` }],
      };
    }
  }
);
}