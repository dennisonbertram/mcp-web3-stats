import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTokenCategoriesResource(server: McpServer) {
  server.resource(
  "token_categories",
  "web3-stats://tokens/categories",
  {
    name: "Token Categories",
    description: "Categorized lists of tokens for analysis",
    mimeType: "application/json"
  },
  async (uri) => {
    const tokenCategories = {
      "governance_tokens": {
        "1": {
          "UNI": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
          "AAVE": "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
          "COMP": "0xc00e94Cb662C3520282E6f5717214004A7f26888",
          "MKR": "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2",
          "CRV": "0xD533a949740bb3306d119CC777fa900bA034cd52",
          "BAL": "0xba100000625a3754423978a60c9317c58a424e3D",
          "YFI": "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
          "SUSHI": "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
          "SNX": "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F",
          "1INCH": "0x111111111117dC0aa78b770fA6A738034120C302"
        }
      },
      "wrapped_tokens": {
        "1": {
          "WETH": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          "WBTC": "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
          "renBTC": "0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D",
          "WBNB": "0x418D75f65a02b3D53B2418FB8E1fe493759c7605"
        },
        "10": {
          "WETH": "0x4200000000000000000000000000000000000006"
        },
        "56": {
          "WBNB": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
          "WETH": "0x2170Ed0880ac9A755fd29B2688956BD959F933F8"
        },
        "137": {
          "WMATIC": "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
          "WETH": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"
        },
        "42161": {
          "WETH": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
        },
        "43114": {
          "WAVAX": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"
        }
      },
      "liquid_staking": {
        "1": {
          "stETH": "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
          "rETH": "0xae78736Cd615f374D3085123A210448E74Fc6393",
          "cbETH": "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704",
          "sfrxETH": "0xac3E018457B222d93114458476f3E3416Abbe38F",
          "ankrETH": "0xE95A203B1a91a908F9B9CE46459d101078c2c3cb"
        }
      },
      "algorithmic_stables": {
        "historical": {
          "UST": "Terra USD (collapsed)",
          "TITAN": "Iron Finance (collapsed)",
          "FEI": "Fei Protocol (wound down)"
        }
      },
      "rebase_tokens": {
        "1": {
          "AMPL": "0xD46bA6D942050d489DBd938a2C909A5d5039A161",
          "OHM": "0x64aa3364F17a4D01c6f1751Fd97C2BD3D7e7f1D5"
        }
      }
    };

    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify({
          description: "Categorized token lists for analysis",
          lastUpdated: "2024-01-31",
          categories: tokenCategories,
          notes: {
            "governance": "Tokens used for protocol governance",
            "wrapped": "Wrapped versions of native assets",
            "liquid_staking": "Liquid staking derivatives",
            "algorithmic_stables": "Algorithmic stablecoins (many failed)",
            "rebase": "Tokens with elastic supply"
          }
        }, null, 2)
      }]
    };
  }
);
}