import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerStablecoinAddressesResource(server: McpServer) {
  server.resource(
  "stablecoin_addresses",
  "web3-stats://tokens/stablecoins",
  {
    name: "Stablecoin Addresses",
    description: "Known stablecoin contract addresses across different chains",
    mimeType: "application/json"
  },
  async (uri) => {
    const stablecoins = {
      "1": { // Ethereum
        "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "DAI": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        "BUSD": "0x4Fabb145d64652a948d72533023f6E7A623C7C53",
        "TUSD": "0x0000000000085d4780B73119b644AE5ecd22b376",
        "FRAX": "0x853d955aCEf822Db058eb8505911ED77F175b99e",
        "LUSD": "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0",
        "GUSD": "0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd",
        "PAX": "0x8E870D67F660D95d5be530380D0eC0bd388289E1",
        "sUSD": "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51",
        "USDD": "0x0C10bF8FcB7Bf5412187A595ab97a3609160b5c6",
        "MIM": "0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3"
      },
      "10": { // Optimism
        "USDC": "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
        "USDC.e": "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
        "USDT": "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
        "DAI": "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
        "sUSD": "0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9",
        "LUSD": "0xc40F949F8a4e094D1b49a23ea9241D289B7b2819",
        "FRAX": "0x2E3D870790dC77A83DD1d18184Acc7439A53f475"
      },
      "56": { // BSC
        "BUSD": "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
        "USDT": "0x55d398326f99059fF775485246999027B3197955",
        "USDC": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        "DAI": "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
        "TUSD": "0x14016E85a25aeb13065688cAFB43044C2ef86784",
        "UST": "0x23396cF899Ca06c4472205fC903bDB4de249D6fC"
      },
      "137": { // Polygon
        "USDC": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        "USDT": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        "DAI": "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
        "BUSD": "0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39",
        "TUSD": "0x2e1AD108ff1D8C782fcBbB89AAd783aC49586756",
        "FRAX": "0x45c32fA6DF82ead1e2EF74d17b76547EDdFaFF89",
        "GUSD": "0xC8A94a3d3D2dabC3C1CaffFFDcA6A7543c3e3e65"
      },
      "42161": { // Arbitrum
        "USDC": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
        "USDC.e": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
        "USDT": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        "DAI": "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
        "FRAX": "0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F",
        "MIM": "0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A",
        "LUSD": "0x93b346b6BC2548dA6A1E7d98E9a421B42541425b"
      },
      "8453": { // Base
        "USDC": "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
        "USDbC": "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
        "DAI": "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
      },
      "43114": { // Avalanche
        "USDC": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
        "USDC.e": "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
        "USDT": "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
        "USDT.e": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118",
        "DAI.e": "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
        "BUSD": "0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39",
        "FRAX": "0xD24C2Ad096400B6FBcd2ad8B24E7acBc21A1da64"
      }
    };

    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify({
          description: "Stablecoin contract addresses by chain",
          lastUpdated: "2024-01-31",
          stablecoins: stablecoins,
          notes: {
            ".e": "Bridged version (usually from Ethereum)",
            "native": "Native/canonical version on that chain"
          }
        }, null, 2)
      }]
    };
  }
);
}