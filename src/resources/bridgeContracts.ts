import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerBridgeContractsResource(server: McpServer) {
  server.resource(
  "bridge_contracts",
  "web3-stats://contracts/bridges",
  {
    name: "Bridge Contracts",
    description: "Known bridge contracts for cross-chain transfers",
    mimeType: "application/json"
  },
  async (uri) => {
    const bridges = {
      "cross_chain_bridges": {
        "wormhole": {
          "1": "0x3ee18B2214AFF97000D974cf647E7C347E8fa585", // Ethereum
          "10": "0x1D1499e622D69689cdf9004d05Ec547d650Ff211", // Optimism
          "56": "0xB6F6D86a8f9879A9c87f643768d9efc38c1Da6E7", // BSC
          "137": "0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE", // Polygon
          "42161": "0x0b2402144Bb366A632D14B83F244D2e0e21bD39c", // Arbitrum
          "43114": "0x0e082F06FF657D94310cB8cE8B0D9a04541d8052" // Avalanche
        },
        "layerzero": {
          "endpoint_v1": {
            "1": "0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675",
            "10": "0x3c2269811836af69497E5F486A85D7316753cf62",
            "56": "0x3c2269811836af69497E5F486A85D7316753cf62",
            "137": "0x3c2269811836af69497E5F486A85D7316753cf62",
            "42161": "0x3c2269811836af69497E5F486A85D7316753cf62",
            "43114": "0x3c2269811836af69497E5F486A85D7316753cf62"
          }
        },
        "across": {
          "1": "0x4D9079Bb4165aeb4084c526a32695dCfd2F77381", // Ethereum
          "10": "0xa420b2d1c0841415A695b81E5B867BCD07Dff8C9", // Optimism
          "137": "0x69B5c72837769eF1e7C164Abc6515DcFf217F920", // Polygon
          "42161": "0xB88690461dDbaB6f04Dfad7df66B7725942FEb9C" // Arbitrum
        },
        "stargate": {
          "router": {
            "1": "0x8731d54E9D02c286767d56ac03e8037C07e01e98",
            "10": "0xB0D502E938ed5f4df2E681fE6E419ff29631d62b",
            "56": "0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8",
            "137": "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd",
            "42161": "0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614",
            "43114": "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd"
          }
        },
        "synapse": {
          "1": "0x2796317b0fF8538F253012862c06787Adfb8cEb6",
          "10": "0xAf41a65F786339e7911F4acDAD6BD49426F2Dc6b",
          "56": "0xd123f70AE324d34A9E76b67a27bf77593bA8749f",
          "137": "0x8F5BBB2BB8c2Ee94639E55d5F41de9b4839C1280",
          "42161": "0x6F4e8eBa4D337f874Ab57478AcC2Cb5BACdc19c9",
          "43114": "0xC05e61d0E7a63D27546389B7aD62FdFf5A91aACE"
        },
        "hop": {
          "1": "0x3666f603Cc164936C1b87e207F36BEBa4AC5f18a",
          "10": "0x83f6244Bd87662118d96D9a6D44f09dffF14b30E",
          "137": "0x553bC791D746767166fA3888432038193cEED5E2",
          "42161": "0x72209Fe68386b37A40d6bCA04f78356fd342491f"
        },
        "celer_cbridge": {
          "1": "0x5427FEFA711Eff984124bFBB1AB6fbf5E3DA1820",
          "10": "0x9D39Fc627A6d9d9F8C831c16995b209548cc3401",
          "56": "0xdd90E5E87A2081Dcf0391920868eBc2FFB81a1aF",
          "137": "0x88DCDC47D2f83a99CF0000FDF667A468bB958a78",
          "42161": "0x1619DE6B6B20eD217a58d00f37B9d47C7663feca",
          "43114": "0xef3c714c9425a8F3697A9C969Dc1af30ba82e5d4"
        },
        "multichain": {
          "1": "0x6b7a87899490EcE95443e979cA9485CBE7E71522",
          "56": "0xf391e8a92e7E5f7b86016b46202Dd160c0598b79",
          "137": "0x4f3Aff3A747fCADe12598081e80c6605A8be192F",
          "43114": "0xC1aAE9d18bBe386B102435a8632C8063d31e747C"
        }
      },
      "native_l2_bridges": {
        "optimism": {
          "l1_standard_bridge": "0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1",
          "l2_standard_bridge": "0x4200000000000000000000000000000000000010"
        },
        "base": {
          "l1_standard_bridge": "0x3154Cf16ccdb4C6d922629664174b904d80F2C35",
          "l2_standard_bridge": "0x4200000000000000000000000000000000000010"
        },
        "arbitrum": {
          "l1_gateway_router": "0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef",
          "l1_erc20_gateway": "0xa3A7B6F88361F48403514059F1F16C8E78d60EeC",
          "l2_gateway_router": "0x5288c571Fd7aD117beA99bF60FE0846C4E84F933",
          "l2_erc20_gateway": "0x09e9222E96E7B4AE2a407B98d48e330053351EEe"
        },
        "polygon": {
          "root_chain_manager": "0xA0c68C638235ee32657e8f720a23ceC1bFc77C77",
          "erc20_predicate": "0x40ec5B33f54e0E8A33A975908C5BA1c14e5BbbDf"
        },
        "zksync": {
          "l1_bridge": "0x57891966931Eb4Bb6FB81430E6cE0A03AAbDe063",
          "l2_bridge": "0x11f943b2c77b743AB90f4A0Ae7d5A4e7FCA3E102"
        }
      }
    };

    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify({
          description: "Bridge contracts for cross-chain transfers",
          lastUpdated: "2024-01-31",
          bridges: bridges,
          notes: {
            "cross_chain_bridges": "Third-party bridges that support multiple chains",
            "native_l2_bridges": "Official bridges for L2 networks"
          }
        }, null, 2)
      }]
    };
  }
);
}