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
    Use the configured build script which utilizes the TypeScript compiler (`tsc`):
    ```bash
    bun run build
    ```
    This command executes `bunx tsc` as defined in `package.json`. `tsc` uses the `tsconfig.json` file to determine entry points (like `index.ts`) and compilation options, outputting the JavaScript files to the `./dist` directory.

    You can then run the built server with Node.js or Bun:
    ```bash
    node dist/index.js 
    # or
    bun dist/index.js
    ```

    *Alternatively, if you wish to use Bun's built-in bundler directly (which may have different behavior or configuration needs than `tsc`), you would typically specify the entry point explicitly:* 
    *`bun build ./index.ts --outdir ./dist`* 
    *However, this project is set up to use `tsc` for builds via the `bun run build` script.*

## Testing with MCP Inspector

Once the server is running (e.g., via `bun start` in one terminal), you can connect to it using the MCP Inspector in another terminal:

```bash
# If running the TypeScript source directly
npx @modelcontextprotocol/inspector bun run index.ts
```
Or, if you have built the server and are running the JavaScript version:
```bash
# If running the built JavaScript version from ./dist
npx @modelcontextprotocol/inspector node dist/index.js
```

This will launch the Inspector UI, allowing you to discover and test the tools, resources, and prompts provided by this server.

## Integrating with MCP Clients (e.g., Claude Desktop)

To use this server with an MCP client like Claude Desktop, you'll need to configure the client to launch this server. For Claude Desktop, you would modify its `claude_desktop_config.json` file (typically found at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows).

Below are example configurations. You can choose a server name (e.g., `dune_api_server` or `web3_stats_server`) that makes sense to you.

**Example 1: Running the built JavaScript version with Node.js (Recommended for stability)**

This assumes you have already run `bun run build` to create the `./dist` directory.

```json
{
  "mcpServers": {
    "dune_api_server": { // You can name this server entry whatever you like
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/YOUR/dune-mcp-server/dist/index.js"
      ]
      // The DUNE_API_KEY will be loaded by the server from its .env file,
      // so it does not need to be specified in the "env" block here if the .env
      // file is correctly placed in your server's project root.
    }
  }
}
```

**Example 2: Running the TypeScript source directly with Bun**

This is convenient for development but might require specifying the full path to your Bun executable.

```json
{
  "mcpServers": {
    "dune_api_server_dev": { // You can name this server entry whatever you like
      "command": "/full/path/to/your/bun/executable", // e.g., /Users/username/.bun/bin/bun or C:\Users\username\.bun\bin\bun.exe
      "args": [
        "run",
        "/ABSOLUTE/PATH/TO/YOUR/dune-mcp-server/index.ts"
      ]
      // As above, DUNE_API_KEY is loaded from the server's .env file.
    }
  }
}
```

**Important Configuration Notes:**

*   **Absolute Paths:** You **MUST** replace `/ABSOLUTE/PATH/TO/YOUR/...` with the correct and full absolute path to the `dist/index.js` file (for Node) or `index.ts` file (for Bun direct execution) and to the Bun executable if running TypeScript directly.
*   **`.env` File:** Ensure the `.env` file containing your `DUNE_API_KEY` is located in the root directory of your `dune-mcp-server` project. The server script uses `dotenv` to load this key when it starts.
*   **Bun Executable Path:** If using Bun directly (Example 2), the `command` might need to be the full, absolute path to your Bun executable (e.g., `~/.bun/bin/bun` on macOS/Linux, or the equivalent path on Windows) if it's not universally in the PATH for applications like Claude Desktop.
*   **Restart Client:** After saving changes to `claude_desktop_config.json`, you must restart Claude Desktop for the changes to take effect.
