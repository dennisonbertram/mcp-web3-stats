import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerDexRouterContractsResource(server: McpServer) {
  server.resource(
  "dex_router_contracts",
  "web3-stats://contracts/dex-routers",
  {
    name: "DEX Router Contracts",
    description: "Major decentralized exchange router contracts across different chains",
    mimeType: "application/json"
  },
  async (uri) => {
    const dexRouters = {
      "1": { // Ethereum
        "uniswap_v2": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        "uniswap_v3": "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        "uniswap_universal": "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
        "sushiswap": "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
        "1inch_v5": "0x1111111254EEB25477B68fb85Ed929f73A960582",
        "0x_exchange_proxy": "0xDef1C0ded9bec7F1a1670819833240f027b25EfF",
        "curve_router": "0x99a58482BD75cbab83b27EC03CA68fF489b5788f",
        "balancer_v2": "0xBA12222222228d8Ba445958a75a0704d566BF2C8"
      },
      "10": { // Optimism
        "uniswap_v3": "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        "velodrome": "0x9c12939390052919aF3155f41Bf4160Fd3666A6f",
        "1inch_v5": "0x1111111254EEB25477B68fb85Ed929f73A960582",
        "0x_exchange_proxy": "0xDef1C0ded9bec7F1a1670819833240f027b25EfF"
      },
      "56": { // BSC
        "pancakeswap_v2": "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        "pancakeswap_v3": "0x1b81D678ffb9C0263b24A97847620C99d213eB14",
        "1inch_v5": "0x1111111254EEB25477B68fb85Ed929f73A960582",
        "apeswap": "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7"
      },
      "137": { // Polygon
        "quickswap": "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
        "uniswap_v3": "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        "sushiswap": "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
        "1inch_v5": "0x1111111254EEB25477B68fb85Ed929f73A960582",
        "0x_exchange_proxy": "0xDef1C0ded9bec7F1a1670819833240f027b25EfF"
      },
      "42161": { // Arbitrum
        "uniswap_v3": "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        "sushiswap": "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
        "camelot": "0xc873fEcbd354f5A56E00E710B90EF4201db2448d",
        "1inch_v5": "0x1111111254EEB25477B68fb85Ed929f73A960582",
        "gmx": "0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064"
      },
      "8453": { // Base
        "uniswap_v3": "0x2626664c2603336E57B271c5C0b26F421741e481",
        "aerodrome": "0x6CB442acF35158D5eDa88fe602221b67B400Be3E",
        "baseswap": "0x327Df1E6de05895d2ab08513aaDD9313Fe505d86",
        "1inch_v5": "0x1111111254EEB25477B68fb85Ed929f73A960582"
      },
      "43114": { // Avalanche
        "traderjoe_v2": "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",
        "pangolin": "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106",
        "1inch_v5": "0x1111111254EEB25477B68fb85Ed929f73A960582"
      }
    };

    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify({
          description: "Major DEX router contracts by chain",
          lastUpdated: "2024-01-31",
          routers: dexRouters,
          usage: "Use these addresses to identify DEX interactions and routing patterns"
        }, null, 2)
      }]
    };
  }
);
}