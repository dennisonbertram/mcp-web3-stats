import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callDuneApi } from "../utils/api.js";
import { BLOCKSCOUT_NETWORKS } from "../utils/constants.js";

export function registerSupportedNetworksResource(server: McpServer) {
  server.resource(
  "supported_networks",
  "web3-stats://supported-networks",
  {
    name: "Supported Networks",
    description: "Unified list of networks supported by both Dune and Blockscout APIs with their capabilities.",
    mimeType: "application/json"
  },
  async (uri) => {
    try {
      // Get Dune supported chains
      const duneChains = await callDuneApi("/v1/evm/supported-chains").catch(err => ({ error: err.message }));
      
      // Build unified network list
      const networks: any = {};
      
      // Add known Blockscout networks
      Object.entries(BLOCKSCOUT_NETWORKS).forEach(([chainId, network]) => {
        networks[chainId] = {
          chainId: chainId,
          name: network.name,
          blockscout: {
            available: true,
            url: network.url,
            apiVersion: "v2"
          },
          dune: {
            available: false,
            capabilities: {}
          }
        };
      });
      
      // Merge Dune capabilities
      if ((duneChains as any)?.chains) {
        (duneChains as any).chains.forEach((chain: any) => {
          const chainId = String(chain.chain_id);
          if (!networks[chainId]) {
            networks[chainId] = {
              chainId: chainId,
              name: chain.name,
              blockscout: {
                available: false
              },
              dune: {
                available: true,
                capabilities: {}
              }
            };
          } else {
            networks[chainId].dune = {
              available: true,
              capabilities: {}
            };
          }
          
          // Add Dune capabilities
          Object.entries(chain.endpoints || {}).forEach(([endpoint, supported]) => {
            if (supported) {
              networks[chainId].dune.capabilities[endpoint] = true;
            }
          });
        });
      }
      
      // Sort by chain ID
      const sortedNetworks = Object.fromEntries(
        Object.entries(networks).sort(([a], [b]) => Number(a) - Number(b))
      );
      
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify({
            networks: sortedNetworks,
            summary: {
              totalNetworks: Object.keys(sortedNetworks).length,
              blockscoutOnly: Object.values(sortedNetworks).filter((n: any) => n.blockscout.available && !n.dune.available).length,
              duneOnly: Object.values(sortedNetworks).filter((n: any) => !n.blockscout.available && n.dune.available).length,
              bothApis: Object.values(sortedNetworks).filter((n: any) => n.blockscout.available && n.dune.available).length,
            }
          }, null, 2),
        }],
      };
    } catch (error: any) {
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/plain",
          text: `Error fetching network support: ${error.message}`,
        }],
      };
    }
  }
);
}