# Dune API MCP Server

This project implements a Model Context Protocol (MCP) server that exposes functionality from the Dune API, allowing LLM agents and other MCP clients to analyze blockchain information.

## Features

The server provides the following MCP tools and resources based on the Dune API:

**EVM Tools:**
*   `get_evm_balances`: Fetches EVM token balances for a wallet.
*   `get_evm_activity`: Fetches EVM account activity.
*   `get_evm_collectibles`: Fetches EVM NFT collectibles.
*   `get_evm_transactions`: Retrieves granular EVM transaction details.
*   `get_evm_token_info`: Fetches metadata and price for EVM tokens.
*   `get_evm_token_holders`: Discovers EVM token holder distributions.

**SVM Tools:**
*   `get_svm_balances`: Fetches SVM token balances.
*   `get_svm_transactions`: Fetches SVM transactions (Solana only).

**Resources:**
*   `dune://evm/supported-chains`: Provides a list of EVM chains supported by the Dune API.

**Prompts:**
*   `/evm_wallet_overview {walletAddress}`: Get a quick overview of an EVM wallet.
*   `/analyze_erc20_token {chainId} {tokenAddress}`: Analyze a specific ERC20 token.
*   `/svm_address_check {walletAddress}`: Check basic information for an SVM address.

## Prerequisites

*   [Bun](https://bun.sh/) (latest version recommended)
*   A Dune API Key from [Sim API](https://docs.sim.dune.com/)

## Setup

1.  **Clone the repository (if applicable) or ensure you have the project files.**

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the project root and add your Dune API key:
    ```env
    DUNE_API_KEY=your_actual_dune_api_key_here
    ```
    Replace `your_actual_dune_api_key_here` with your valid key.

## Running the Server

*   **To run the server directly using Bun (for development/testing):**
    ```bash
    bun start
    ```
    The server will start and listen for MCP messages via stdio.

*   **To build the server to JavaScript (for environments that require JS):**
    ```bash
    bun run build
    ```
    This will compile the TypeScript to JavaScript in the `./dist` directory. You can then run it with Node.js or Bun:
    ```bash
    node dist/index.js 
    # or
    bun dist/index.js
    ```

## Testing with MCP Inspector

Once the server is running (e.g., via `bun start` in one terminal), you can connect to it using the MCP Inspector in another terminal:

```bash
npx @modelcontextprotocol/inspector bun run index.ts
```
Or, if you have built the server:
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

This will launch the Inspector UI, allowing you to discover and test the tools, resources, and prompts provided by this server.

## Integrating with MCP Clients (e.g., Claude Desktop)

To use this server with an MCP client like Claude Desktop, you'll need to configure the client to launch this server. For Claude Desktop, you would modify its `claude_desktop_config.json` file.

Example configuration for `claude_desktop_config.json` (macOS/Linux, adjust paths as necessary):

**If running directly with Bun:**
```json
{
  "mcpServers": {
    "dune_analyzer": {
      "command": "/full/path/to/bun", // e.g., /Users/username/.bun/bin/bun
      "args": [
        "run",
        "/full/path/to/your/dune-mcp-server/index.ts"
      ],
      "env": {
        // DUNE_API_KEY should be picked up from the .env file in the server's directory
      }
    }
  }
}
```

**If running the built JavaScript version with Node:**
```json
{
  "mcpServers": {
    "dune_analyzer": {
      "command": "node",
      "args": [
        "/full/path/to/your/dune-mcp-server/dist/index.js"
      ],
      "env": {
        // DUNE_API_KEY should be picked up from the .env file in the server's directory
      }
    }
  }
}
```

**Important:** 
* Replace `/full/path/to/...` with the actual absolute paths on your system.
* Ensure the `.env` file with `DUNE_API_KEY` is in the same directory as `index.ts` (or `dist/index.js`) so `dotenv` can load it when the server starts.
* The `command` for Bun might need to be the full path to the Bun executable if it's not in the default PATH for the client application.
