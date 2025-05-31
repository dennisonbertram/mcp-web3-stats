import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerSecurityPatternsResource(server: McpServer) {
  server.resource(
  "security_patterns",
  "web3-stats://security/patterns",
  {
    name: "Security Patterns",
    description: "Known spam addresses, vulnerability patterns, and suspicious behaviors",
    mimeType: "application/json"
  },
  async (uri) => {
    const securityData = {
      "known_spam_tokens": {
        "patterns": [
          "Visit.*to claim",
          "Reward.*Token",
          "Airdrop.*claim",
          "\\$.*USD.*Voucher",
          "zepe\\.io",
          "blur\\.io.*ETH"
        ],
        "addresses": {
          "1": [
            "0x0000000000000000000000000000000000000000", // Null address spam
            "0xdead000000000000000042069420694206942069", // Dead address variants
          ]
        }
      },
      "honeypot_indicators": {
        "contract_patterns": [
          "Can modify fees to 100%",
          "Hidden mint function",
          "Pausable transfers without timelock",
          "Blacklist function without governance",
          "Transfer restrictions based on holder status",
          "Hidden owner privileges in transfer logic",
          "Max transaction amount can be set to 0"
        ],
        "behavioral_patterns": [
          "100% of liquidity in single pool",
          "Liquidity added and locked for <30 days",
          "Single large holder (>50%) that's not a contract",
          "Many failed transactions from unique addresses",
          "Buy transactions succeed, sells fail"
        ]
      },
      "rugpull_patterns": {
        "pre_launch": [
          "Anonymous team with no doxxing",
          "Cloned contract with minor modifications",
          "Aggressive marketing with unrealistic promises",
          "Presale with no vesting schedule",
          "Team tokens unlocked at launch"
        ],
        "post_launch": [
          "Liquidity removal within 48 hours",
          "Team wallets dumping tokens",
          "Social media accounts deleted",
          "Website goes offline",
          "Contract modifications after launch"
        ]
      },
      "suspicious_deployer_patterns": {
        "behaviors": [
          "Multiple similar contracts deployed",
          "Contracts abandoned after liquidity removal",
          "Pattern of tokens with <1 week lifespan",
          "Funded through mixing services",
          "No historical legitimate projects"
        ],
        "known_addresses": {
          "description": "Addresses with history of scams/rugpulls",
          "list": [
            // This would be populated with actual addresses
          ]
        }
      },
      "common_vulnerabilities": {
        "reentrancy": {
          "pattern": "External calls before state updates",
          "example": "transfer() called before balance update"
        },
        "integer_overflow": {
          "pattern": "Arithmetic without SafeMath (pre-0.8.0)",
          "example": "balances[to] += amount without checks"
        },
        "access_control": {
          "pattern": "Missing modifier checks on critical functions",
          "example": "mint() without onlyOwner"
        },
        "front_running": {
          "pattern": "Predictable transactions with value",
          "example": "DEX trades without slippage protection"
        }
      },
      "mev_patterns": {
        "sandwich_attack": {
          "detection": "Buy transaction immediately before and sell after target tx",
          "characteristics": [
            "Same buyer/seller address",
            "Transactions in same block",
            "Target transaction has high slippage"
          ]
        },
        "arbitrage": {
          "detection": "Profitable trades across DEXes in same block",
          "characteristics": [
            "Multiple DEX interactions",
            "Zero net token change",
            "Profit in ETH/stables"
          ]
        }
      }
    };

    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify({
          description: "Security patterns for blockchain analysis",
          lastUpdated: "2024-01-31",
          patterns: securityData,
          usage: "Reference these patterns when analyzing contracts and transactions for security risks"
        }, null, 2)
      }]
    };
  }
);
}