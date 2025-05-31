import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerSupportedNetworksResource } from './supportedNetworks.js';
import { registerDuneEvmSupportedChainsResource } from './duneEvmSupportedChains.js';
import { registerDexRouterContractsResource } from './dexRouterContracts.js';
import { registerStablecoinAddressesResource } from './stablecoinAddresses.js';
import { registerBridgeContractsResource } from './bridgeContracts.js';
import { registerSecurityPatternsResource } from './securityPatterns.js';
import { registerTokenCategoriesResource } from './tokenCategories.js';

export function registerAllResources(server: McpServer) {
  registerSupportedNetworksResource(server);
  registerDuneEvmSupportedChainsResource(server);
  registerDexRouterContractsResource(server);
  registerStablecoinAddressesResource(server);
  registerBridgeContractsResource(server);
  registerSecurityPatternsResource(server);
  registerTokenCategoriesResource(server);
}