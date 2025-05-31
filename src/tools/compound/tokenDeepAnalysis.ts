import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callDuneApi } from "../../utils/api.js";
import { callBlockscoutApi } from "../../utils/api.js";
import { BLOCKSCOUT_NETWORKS } from "../../utils/constants.js";

export function registerTokenDeepAnalysisTool(server: McpServer) {
  server.tool(
  "token_deep_analysis",
  "Comprehensive token analysis combining real-time transfers from Blockscout with holder analytics from Dune.",
  {
    tokenAddress: z.string().describe("The token contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ tokenAddress, chainId }) => {
    try {
      // Fetch data from both sources in parallel
      const [
        blockscoutTokenInfo,
        blockscoutTransfers,
        blockscoutHolders,
        duneTokenInfo,
        duneHolders
      ] = await Promise.all([
        // Blockscout data
        callBlockscoutApi(chainId, `/tokens/${tokenAddress}`).catch(err => ({ error: err.message })),
        callBlockscoutApi(chainId, `/tokens/${tokenAddress}/transfers`, new URLSearchParams({ items_count: "10" }))
          .catch(err => ({ error: err.message })),
        callBlockscoutApi(chainId, `/tokens/${tokenAddress}/holders`, new URLSearchParams({ items_count: "10" }))
          .catch(err => ({ error: err.message })),
        // Dune data
        callDuneApi(`/v1/evm/token-info/${chainId}/${tokenAddress}`, new URLSearchParams({ chain_ids: chainId }))
          .catch(err => ({ error: err.message })),
        callDuneApi(`/v1/evm/token-holders/${chainId}/${tokenAddress}`, new URLSearchParams({ limit: "10" }))
          .catch(err => ({ error: err.message }))
      ]) as [any, any, any, any, any];

      // Analyze holder concentration
      const holderAnalysis = {
        concentration: "unknown",
        topHolderPercentage: 0,
      };
      
      if (duneHolders?.items?.length > 0) {
        const top10Balance = duneHolders.items.reduce((sum: number, holder: any) => 
          sum + parseFloat(holder.percentage_of_total_supply || "0"), 0
        );
        holderAnalysis.concentration = top10Balance > 50 ? "high" : top10Balance > 25 ? "medium" : "low";
        holderAnalysis.topHolderPercentage = top10Balance;
      }

      const forensics = {
        token: {
          address: tokenAddress,
          chainId: chainId,
          network: BLOCKSCOUT_NETWORKS[chainId]?.name || `Chain ${chainId}`,
        },
        basicInfo: {
          name: blockscoutTokenInfo?.name || duneTokenInfo?.name,
          symbol: blockscoutTokenInfo?.symbol || duneTokenInfo?.symbol,
          decimals: blockscoutTokenInfo?.decimals || duneTokenInfo?.decimals,
          type: blockscoutTokenInfo?.type || duneTokenInfo?.type,
          totalSupply: blockscoutTokenInfo?.total_supply || duneTokenInfo?.total_supply,
        },
        marketMetrics: {
          price: duneTokenInfo?.current_price,
          marketCap: duneTokenInfo?.market_cap || blockscoutTokenInfo?.circulating_market_cap,
          volume24h: duneTokenInfo?.volume_24h || blockscoutTokenInfo?.volume_24h,
          holderCount: blockscoutTokenInfo?.holders_count || duneTokenInfo?.holder_count,
        },
        activity: {
          recentTransfers: blockscoutTransfers,
          transferCount24h: blockscoutTokenInfo?.counters?.transfers_count_24h,
        },
        holders: {
          topHoldersBlockscout: blockscoutHolders,
          topHoldersDune: duneHolders,
          analysis: holderAnalysis,
        },
        risks: {
          isVerified: !blockscoutTokenInfo?.error && blockscoutTokenInfo?.address !== undefined,
          hasLiquidity: duneTokenInfo?.volume_24h > 0,
          holderConcentration: holderAnalysis.concentration,
          warnings: [] as string[]
        }
      };

      // Add risk warnings
      if (holderAnalysis.concentration === "high") {
        forensics.risks.warnings.push("High holder concentration - top 10 holders own >50% of supply");
      }
      if (!forensics.risks.isVerified) {
        forensics.risks.warnings.push("Token contract not found or not verified");
      }
      if (!forensics.risks.hasLiquidity) {
        forensics.risks.warnings.push("Low or no trading volume in last 24h");
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(forensics, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error analyzing token: ${error.message}` }],
      };
    }
  }
);
}