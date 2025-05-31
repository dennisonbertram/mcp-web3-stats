# Web3 Stats Enhanced - Dune + Blockscout MCP Server

This project implements a Model Context Protocol (MCP) server that combines the power of Dune Analytics and Blockscout APIs, providing comprehensive blockchain data analysis capabilities for LLM agents and MCP clients.

## 🚀 What's New in Version 2.0

This enhanced version adds **Blockscout integration** alongside the existing Dune API, enabling:
- **Real-time blockchain data** from Blockscout (transactions, contracts, logs)
- **Aggregated analytics** from Dune (holder distributions, price trends)
- **Compound tools** that intelligently combine both data sources
- **Support for 9+ blockchain networks** with more coming

## Features

### 🔷 Dune API Tools (Aggregated Analytics)
**EVM Tools:**
- `get_evm_balances`: Fetches EVM token balances for a wallet
- `get_evm_activity`: Fetches EVM account activity
- `get_evm_collectibles`: Fetches EVM NFT collectibles
- `get_evm_transactions`: Retrieves granular EVM transaction details
- `get_evm_token_info`: Fetches metadata and price for EVM tokens
- `get_evm_token_holders`: Discovers EVM token holder distributions

**SVM Tools:**
- `get_svm_balances`: Fetches SVM token balances
- `get_svm_transactions`: Fetches SVM transactions (Solana only)

### 🔶 Blockscout API Tools (Real-time Data)
**Search & Discovery:**
- `blockscout_search`: Universal search across addresses, tokens, blocks, transactions
- `ping_blockscout`: Test connectivity to Blockscout instances

**Address Analysis:**
- `blockscout_address_info`: Get address details, balance, type (EOA/contract)
- `blockscout_address_transactions`: Get all transactions for an address
- `blockscout_address_internal_txs`: Get internal transactions
- `blockscout_address_logs`: Get event logs
- `blockscout_address_token_balances`: Get all token balances

**Transaction Analysis:**
- `blockscout_transaction_details`: Get full transaction details
- `blockscout_transaction_logs`: Get event logs from a transaction
- `blockscout_transaction_internal_txs`: Get internal transactions
- `blockscout_transaction_raw_trace`: Get raw execution trace
- `blockscout_transaction_state_changes`: Get state changes

**Block Explorer:**
- `blockscout_block_details`: Get block information
- `blockscout_block_transactions`: Get all transactions in a block
- `blockscout_latest_blocks`: Get recent blocks

**Smart Contracts:**
- `blockscout_contract_info`: Get verified contract details, ABI, source
- `blockscout_contract_methods`: Get readable/writable methods
- `blockscout_read_contract`: Call contract read methods
- `blockscout_verified_contracts`: List recently verified contracts

**Token & NFT Tools:**
- `blockscout_token_info`: Get token details, supply, decimals
- `blockscout_token_transfers`: Get token transfer history
- `blockscout_token_holders`: Get token holder list
- `blockscout_nft_instances`: Get NFT instances for a collection
- `blockscout_nft_metadata`: Get specific NFT metadata

### 🔥 Compound Tools (Best of Both APIs)
- `investigate_smart_contract`: Deep contract analysis with source code and analytics
- `analyze_transaction_impact`: Full transaction forensics with traces and context
- `token_deep_analysis`: Comprehensive token risk assessment
- `profile_wallet_behavior`: Behavioral profiling with historical patterns

### 📊 Resources
- `dune://evm/supported-chains`: Dune supported chains
- `web3-stats://supported-networks`: Unified network support across both APIs

### 💬 Enhanced Prompts
- `/comprehensive_wallet_analysis`: Deep wallet investigation
- `/smart_contract_deep_dive`: Thorough contract investigation
- `/token_risk_assessment`: Multi-source token risk analysis
- `/transaction_post_mortem`: Transaction impact analysis
- `/compare_networks`: Network capability comparison

**Legacy prompts still supported:**
- `/evm_wallet_overview`: Basic wallet overview
- `/analyze_erc20_token`: Basic token analysis
- `/svm_address_check`: Solana address check

## Quick Start

```bash
# Clone the repository
git clone https://github.com/crazyrabbitLTC/mcp-web3-stats.git
cd mcp-web3-stats

# Install dependencies
bun install

# Create .env file with your Dune API key
echo "DUNE_API_KEY=your_actual_dune_api_key_here" > .env

# Start the server
bun start

# In a separate terminal, run the MCP Inspector to test the tools
npx @modelcontextprotocol/inspector bun run index.ts
```

## Installation from npm

```bash
# Install globally
npm install -g mcp-web3-stats-enhanced

# Set your Dune API key as an environment variable
export DUNE_API_KEY=your_actual_dune_api_key_here

# Run the server
mcp-web3-stats

# In a separate terminal, test with the MCP Inspector
npx @modelcontextprotocol/inspector mcp-web3-stats
```

## Supported Networks

The server supports multiple blockchain networks through Blockscout instances:
- Ethereum (Chain ID: 1)
- Optimism (Chain ID: 10)
- BNB Smart Chain (Chain ID: 56)
- Gnosis (Chain ID: 100)
- Polygon (Chain ID: 137)
- Fantom (Chain ID: 250)
- Base (Chain ID: 8453)
- Arbitrum (Chain ID: 42161)
- Avalanche (Chain ID: 43114)

More networks can be added by updating the `BLOCKSCOUT_NETWORKS` configuration.

## Advanced Use Cases

### 1. Smart Contract Investigation
Combine source code verification with usage analytics:
```
Assistant: I'll investigate this smart contract using both Blockscout and Dune data.

[Uses investigate_smart_contract]

This contract is:
- Verified on Blockscout with Solidity 0.8.19
- Has 45 read methods and 12 write methods
- Processes $2.5M daily volume (from Dune)
- Top 10 holders control 65% of supply
```

### 2. Transaction Forensics
Analyze complex transactions with full context:
```
Assistant: Let me analyze this transaction's complete impact.

[Uses analyze_transaction_impact]

Transaction breakdown:
- Triggered 15 internal transactions
- Changed 8 storage slots
- Emitted 12 events
- Sender has 500+ previous transactions
- This was their largest transaction this month
```

### 3. Token Risk Assessment
Comprehensive token analysis across both platforms:
```
Assistant: I'll perform a deep risk assessment of this token.

[Uses token_deep_analysis]

Risk Assessment:
⚠️ High concentration: Top 10 holders own 78%
✅ Verified contract with clean code
⚠️ Low liquidity: $50k daily volume
✅ Active development: 50+ transfers in last hour
```

### 4. Wallet Behavioral Analysis
Profile wallets using combined historical and real-time data:
```
Assistant: Let me create a behavioral profile for this wallet.

[Uses profile_wallet_behavior]

Wallet Profile:
- Type: DeFi Power User
- 1,250 total transactions
- Interacts with 45 unique contracts
- Portfolio: 60% stablecoins, 30% DeFi tokens, 10% NFTs
- Activity level: High (50+ tx/month)
```

## Configuration

### Environment Variables
- `DUNE_API_KEY`: Required API key from [Dune Analytics](https://docs.dune.com/api)

### Adding New Blockscout Networks
Edit the `BLOCKSCOUT_NETWORKS` object in `index.ts`:
```typescript
const BLOCKSCOUT_NETWORKS = {
  "1": { name: "Ethereum", url: "https://eth.blockscout.com", chainId: "1" },
  // Add new networks here
};
```

## Integrating with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "web3_stats_enhanced": {
      "command": "node",
      "args": [
        "/path/to/mcp-web3-stats/dist/index.js"
      ],
      "env": {
        "DUNE_API_KEY": "your_actual_dune_api_key_here"
      }
    }
  }
}
```

## Development

```bash
# Build TypeScript to JavaScript
bun run build

# Run tests (when available)
bun test

# Run in development mode
bun run index.ts
```

## API Rate Limits

- **Dune API**: Rate limits depend on your plan
- **Blockscout**: Most public instances have generous rate limits (typically 100+ requests/second)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [Dune Analytics](https://dune.com) for aggregated blockchain analytics
- [Blockscout](https://blockscout.com) for real-time blockchain data
- [Anthropic MCP](https://modelcontextprotocol.io) for the protocol specification