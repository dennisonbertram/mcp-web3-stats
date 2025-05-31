#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";

// Version from package.json
const VERSION = "2.0.0";

dotenv.config(); // Load environment variables

const DUNE_API_KEY = process.env.DUNE_API_KEY;

if (!DUNE_API_KEY) {
  console.error("FATAL ERROR: DUNE_API_KEY is not set in the environment variables.");
  process.exit(1);
}

// Helper function to call Dune API
async function callDuneApi(path: string, queryParams?: URLSearchParams) {
  const baseUrl = path.startsWith("/beta") ? "https://api.sim.dune.com/beta" : "https://api.sim.dune.com/v1";
  const fullPath = path.startsWith("/beta") ? path.substring("/beta".length) : path.substring("/v1".length);
  
  let url = `${baseUrl}${fullPath}`;

  if (queryParams && queryParams.toString()) {
    url += `?${queryParams.toString()}`;
  }

  console.error(`Calling Dune API: ${url}`); // Log the actual call
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      "X-Sim-Api-Key": DUNE_API_KEY!,
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Dune API request failed with status ${response.status}: ${errorBody}`);
    throw new Error(`Dune API Error: ${response.status} ${response.statusText}. Details: ${errorBody}`);
  }
  return response.json();
}

// Blockscout network configuration
const BLOCKSCOUT_NETWORKS: Record<string, { name: string; url: string; chainId: string }> = {
  "1": { name: "Ethereum", url: "https://eth.blockscout.com", chainId: "1" },
  "10": { name: "Optimism", url: "https://optimism.blockscout.com", chainId: "10" },
  "56": { name: "BNB Smart Chain", url: "https://bscxplorer.com", chainId: "56" },
  "100": { name: "Gnosis", url: "https://gnosis.blockscout.com", chainId: "100" },
  "137": { name: "Polygon", url: "https://polygon.blockscout.com", chainId: "137" },
  "250": { name: "Fantom", url: "https://ftmscan.com", chainId: "250" },
  "8453": { name: "Base", url: "https://base.blockscout.com", chainId: "8453" },
  "42161": { name: "Arbitrum", url: "https://arbitrum.blockscout.com", chainId: "42161" },
  "43114": { name: "Avalanche", url: "https://snowtrace.io", chainId: "43114" },
  // Add more networks as needed
};

// Helper function to call Blockscout API
async function callBlockscoutApi(chainId: string, path: string, queryParams?: URLSearchParams) {
  const network = BLOCKSCOUT_NETWORKS[chainId];
  if (!network) {
    throw new Error(`Unsupported chain ID: ${chainId}. Supported chains: ${Object.keys(BLOCKSCOUT_NETWORKS).join(", ")}`);
  }

  let url = `${network.url}/api/v2${path}`;
  
  if (queryParams && queryParams.toString()) {
    url += `?${queryParams.toString()}`;
  }

  console.error(`Calling Blockscout API (${network.name}): ${url}`); // Log the actual call
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Blockscout API request failed with status ${response.status}: ${errorBody}`);
    throw new Error(`Blockscout API Error (${network.name}): ${response.status} ${response.statusText}. Details: ${errorBody}`);
  }
  return response.json();
}

const server = new McpServer({
  name: "MCPWeb3Stats",
  version: VERSION,
  capabilities: {
    tools: {},
    resources: {},
    prompts: {}
  },
});

server.tool(
  "ping_dune_server",
  "A simple tool to check if the Dune MCP server is responsive.",
  {},
  async () => {
    return {
      content: [{ type: "text", text: "Pong! Dune MCP server is active." }],
    };
  }
);

// Tool to get EVM token balances
server.tool(
  "get_evm_balances",
  "Fetches EVM token balances for a given wallet address from the Dune API. Supports chain filtering, metadata inclusion, spam filtering, and pagination.",
  {
    walletAddress: z.string().describe("The EVM wallet address (e.g., 0xd8da6bf26964af9d7eed9e03e53415d37aa96045)"),
    chainIds: z.string().optional().describe("Optional. Comma-separated list of chain IDs (e.g., '1,56') or 'all' to fetch balances for specific chains."),
    metadata: z.string().optional().describe("Optional. Comma-separated list of metadata to include (e.g., 'url,logo')."),
    excludeSpamTokens: z.boolean().optional().describe("Optional. Set to true to exclude spam tokens."),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Maximum number of balance items to return for pagination.")
    ),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination for balances."),
  },
  async ({ walletAddress, chainIds, metadata, excludeSpamTokens, limit, offset }) => {
    const path = `/v1/evm/balances/${walletAddress}`;
    const queryParams = new URLSearchParams();
    if (chainIds !== undefined) {
      queryParams.append("chain_ids", chainIds);
    }
    if (metadata !== undefined) {
      queryParams.append("metadata", metadata);
    }
    if (excludeSpamTokens !== undefined) {
      queryParams.append("exclude_spam_tokens", String(excludeSpamTokens));
    }
    if (limit !== undefined) {
      queryParams.append("limit", String(limit));
    }
    if (offset !== undefined) {
      queryParams.append("offset", offset);
    }

    try {
      const data = await callDuneApi(path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error.message,
          },
        ],
      };
    }
  }
);

// Tool to get EVM account activity
server.tool(
  "get_evm_activity",
  "Fetches EVM account activity for a given wallet address from the Dune API. Supports spam filtering and pagination.",
  {
    walletAddress: z.string().describe("The EVM wallet address (e.g., 0xd8da6bf26964af9d7eed9e03e53415d37aa96045)"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of activity items to return. Defaults to 25 if not specified by API.")
    ),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination, from a previous 'next_offset' response."),
    excludeSpamTokens: z.boolean().optional().describe("Optional. Set to true to exclude activities related to spam tokens."),
  },
  async ({ walletAddress, limit, offset, excludeSpamTokens }) => {
    const path = `/v1/evm/activity/${walletAddress}`;
    const queryParams = new URLSearchParams();
    if (limit !== undefined) {
      queryParams.append("limit", String(limit));
    }
    if (offset !== undefined) {
      queryParams.append("offset", offset);
    }
    if (excludeSpamTokens !== undefined) {
      queryParams.append("exclude_spam_tokens", String(excludeSpamTokens));
    }

    try {
      const data = await callDuneApi(path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error.message,
          },
        ],
      };
    }
  }
);

// Tool to get EVM NFT collectibles
server.tool(
  "get_evm_collectibles",
  "Fetches EVM NFT collectibles (ERC721 and ERC1155) for a given wallet address. Supports pagination.",
  {
    walletAddress: z.string().describe("The EVM wallet address (e.g., 0xd8da6bf26964af9d7eed9e03e53415d37aa96045)"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of collectible items to return. Defaults to 50 if not specified by API.")
    ),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination."),
  },
  async ({ walletAddress, limit, offset }) => {
    const path = `/v1/evm/collectibles/${walletAddress}`;
    const queryParams = new URLSearchParams();
    if (limit !== undefined) {
      queryParams.append("limit", String(limit));
    }
    if (offset !== undefined) {
      queryParams.append("offset", offset);
    }

    try {
      const data = await callDuneApi(path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error.message,
          },
        ],
      };
    }
  }
);

// Tool to get EVM transactions
server.tool(
  "get_evm_transactions",
  "Retrieves granular EVM transaction details for a given wallet address from the Dune API.",
  {
    walletAddress: z.string().describe("The EVM wallet address (e.g., 0xd8da6bf26964af9d7eed9e03e53415d37aa96045)"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Maximum number of transactions to return.")
    ),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination, taken from 'next_offset' of a previous response."),
    // TODO: Add other potential filter parameters like start_block_time, end_block_time if supported by API and useful
  },
  async ({ walletAddress, limit, offset }) => {
    const path = `/v1/evm/transactions/${walletAddress}`;
    const queryParams = new URLSearchParams();

    if (limit !== undefined) {
      queryParams.append("limit", String(limit));
    }
    if (offset !== undefined) {
      queryParams.append("offset", offset);
    }

    try {
      const data = await callDuneApi(path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error.message,
          },
        ],
      };
    }
  }
);

// Tool to get EVM token information
server.tool(
  "get_evm_token_info",
  "Fetches detailed metadata and real-time price information for a native asset or ERC20 token on EVM chains from the Dune API.",
  {
    chainAndTokenUri: z.string().describe("The URI path segment for the token, e.g., '1/0xTOKEN_ADDRESS' for an ERC20 token on Ethereum (chain_id 1), or '1/native' for Ethereum's native token."),
    chainIds: z.string().describe("Mandatory. Comma-separated list of chain IDs (e.g., '1,56') or 'all' to fetch tokens for all supported chains."),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Maximum number of items to return.")
    ),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination."),
  },
  async ({ chainAndTokenUri, chainIds, limit, offset }) => {
    const path = `/v1/evm/token-info/${chainAndTokenUri}`;
    const queryParams = new URLSearchParams();

    queryParams.append("chain_ids", chainIds); // Mandatory parameter

    if (limit !== undefined) {
      queryParams.append("limit", String(limit));
    }
    if (offset !== undefined) {
      queryParams.append("offset", offset);
    }

    try {
      const data = await callDuneApi(path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error.message,
          },
        ],
      };
    }
  }
);

// Tool to get EVM token holders
server.tool(
  "get_evm_token_holders",
  "Discovers token distribution across ERC20 or ERC721 holders for a given token on a specific EVM chain, ranked by wallet value.",
  {
    chainId: z.union([z.string(), z.number()]).describe("The chain ID (e.g., 1 or '1' for Ethereum)."),
    tokenAddress: z.string().describe("The ERC20 or ERC721 token contract address (e.g., 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)."),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Maximum number of token holders to return.")
    ),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination."),
  },
  async ({ chainId, tokenAddress, limit, offset }) => {
    const path = `/v1/evm/token-holders/${chainId}/${tokenAddress}`;
    const queryParams = new URLSearchParams();

    if (limit !== undefined) {
      queryParams.append("limit", String(limit));
    }
    if (offset !== undefined) {
      queryParams.append("offset", offset);
    }

    try {
      const data = await callDuneApi(path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error.message,
          },
        ],
      };
    }
  }
);

// Tool to get SVM token balances
server.tool(
  "get_svm_balances",
  "Fetches token balances (native, SPL, SPL-2022) for a given SVM wallet address from the Dune API.",
  {
    walletAddress: z.string().describe("The SVM wallet address (e.g., a Solana or Eclipse address)."),
    chains: z.string().optional().describe("Optional. Comma-separated list of chains (e.g., 'solana,eclipse') or 'all'. Defaults to fetching for all supported SVM chains if not specified."),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Maximum number of balance items to return.")
    ),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination."),
  },
  async ({ walletAddress, chains, limit, offset }) => {
    const path = `/beta/svm/balances/${walletAddress}`;
    const queryParams = new URLSearchParams();

    if (chains !== undefined) {
      queryParams.append("chains", chains);
    }
    if (limit !== undefined) {
      queryParams.append("limit", String(limit));
    }
    if (offset !== undefined) {
      queryParams.append("offset", offset);
    }

    try {
      const data = await callDuneApi(path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error.message,
          },
        ],
      };
    }
  }
);

// Tool to get SVM transactions
server.tool(
  "get_svm_transactions",
  "Fetches transactions for a given SVM wallet address (currently Solana only) from the Dune API.",
  {
    walletAddress: z.string().describe("The SVM wallet address (e.g., a Solana address)."),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Maximum number of transactions to return.")
    ),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination."),
  },
  async ({ walletAddress, limit, offset }) => {
    const path = `/beta/svm/transactions/${walletAddress}`;
    const queryParams = new URLSearchParams();

    if (limit !== undefined) {
      queryParams.append("limit", String(limit));
    }
    if (offset !== undefined) {
      queryParams.append("offset", offset);
    }

    try {
      const data = await callDuneApi(path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error.message,
          },
        ],
      };
    }
  }
);

// ============================================
// BLOCKSCOUT API TOOLS
// ============================================

// Tool to test Blockscout connectivity
server.tool(
  "ping_blockscout",
  "Test connectivity to a Blockscout instance for a specific chain.",
  {
    chainId: z.string().describe("The chain ID to test (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ chainId }) => {
    try {
      const network = BLOCKSCOUT_NETWORKS[chainId];
      if (!network) {
        return {
          content: [{ 
            type: "text", 
            text: `Unsupported chain ID: ${chainId}. Supported chains: ${Object.keys(BLOCKSCOUT_NETWORKS).join(", ")}` 
          }],
        };
      }
      
      const data = await callBlockscoutApi(chainId, "/stats");
      return {
        content: [{ 
          type: "text", 
          text: `✓ Blockscout ${network.name} (chain ${chainId}) is active. Network stats: ${JSON.stringify(data, null, 2)}` 
        }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool for Blockscout search
server.tool(
  "blockscout_search",
  "Search across addresses, tokens, blocks, and transactions on a specific blockchain using Blockscout.",
  {
    query: z.string().describe("The search query (address, tx hash, block number, token name, etc.)"),
    chainId: z.string().describe("The chain ID to search on (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ query, chainId }) => {
    const path = "/search";
    const queryParams = new URLSearchParams();
    queryParams.append("q", query);

    try {
      const data = await callBlockscoutApi(chainId, path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to get address information from Blockscout
server.tool(
  "blockscout_address_info",
  "Get detailed information about an address including balance, type (EOA/contract), and basic stats from Blockscout.",
  {
    address: z.string().describe("The address to get information for"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ address, chainId }) => {
    const path = `/addresses/${address}`;

    try {
      const data = await callBlockscoutApi(chainId, path);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to get address transactions from Blockscout
server.tool(
  "blockscout_address_transactions",
  "Get all transactions for an address from Blockscout with filtering and pagination support.",
  {
    address: z.string().describe("The address to get transactions for"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    filter: z.string().optional().describe("Optional. Filter by transaction type: 'from' | 'to' | 'contract_creation'"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of transactions to return (default: 50)")
    ),
    next_page_params: z.string().optional().describe("Optional. Pagination cursor from previous response"),
  },
  async ({ address, chainId, filter, limit, next_page_params }) => {
    const path = `/addresses/${address}/transactions`;
    const queryParams = new URLSearchParams();
    
    if (filter) queryParams.append("filter", filter);
    if (limit) queryParams.append("items_count", String(limit));
    if (next_page_params) queryParams.append("next_page_params", next_page_params);

    try {
      const data = await callBlockscoutApi(chainId, path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to get address internal transactions from Blockscout
server.tool(
  "blockscout_address_internal_txs",
  "Get internal transactions (contract interactions) for an address from Blockscout.",
  {
    address: z.string().describe("The address to get internal transactions for"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    filter: z.string().optional().describe("Optional. Filter by direction: 'from' | 'to'"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of internal transactions to return (default: 50)")
    ),
    next_page_params: z.string().optional().describe("Optional. Pagination cursor from previous response"),
  },
  async ({ address, chainId, filter, limit, next_page_params }) => {
    const path = `/addresses/${address}/internal-transactions`;
    const queryParams = new URLSearchParams();
    
    if (filter) queryParams.append("filter", filter);
    if (limit) queryParams.append("items_count", String(limit));
    if (next_page_params) queryParams.append("next_page_params", next_page_params);

    try {
      const data = await callBlockscoutApi(chainId, path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to get address logs from Blockscout
server.tool(
  "blockscout_address_logs",
  "Get event logs emitted by or to an address from Blockscout.",
  {
    address: z.string().describe("The address to get logs for"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of logs to return (default: 50)")
    ),
    next_page_params: z.string().optional().describe("Optional. Pagination cursor from previous response"),
  },
  async ({ address, chainId, limit, next_page_params }) => {
    const path = `/addresses/${address}/logs`;
    const queryParams = new URLSearchParams();
    
    if (limit) queryParams.append("items_count", String(limit));
    if (next_page_params) queryParams.append("next_page_params", next_page_params);

    try {
      const data = await callBlockscoutApi(chainId, path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to get address token balances from Blockscout
server.tool(
  "blockscout_address_token_balances",
  "Get all token balances (ERC20, ERC721, ERC1155) for an address from Blockscout.",
  {
    address: z.string().describe("The address to get token balances for"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    type: z.string().optional().describe("Optional. Filter by token type: 'ERC-20' | 'ERC-721' | 'ERC-1155'"),
  },
  async ({ address, chainId, type }) => {
    const path = `/addresses/${address}/tokens`;
    const queryParams = new URLSearchParams();
    
    if (type) queryParams.append("type", type);

    try {
      const data = await callBlockscoutApi(chainId, path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// ============================================
// BLOCKSCOUT TRANSACTION TOOLS
// ============================================

// Tool to get transaction details from Blockscout
server.tool(
  "blockscout_transaction_details",
  "Get comprehensive details about a specific transaction from Blockscout.",
  {
    txHash: z.string().describe("The transaction hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ txHash, chainId }) => {
    const path = `/transactions/${txHash}`;

    try {
      const data = await callBlockscoutApi(chainId, path);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to get transaction logs from Blockscout
server.tool(
  "blockscout_transaction_logs",
  "Get event logs emitted by a transaction from Blockscout.",
  {
    txHash: z.string().describe("The transaction hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ txHash, chainId }) => {
    const path = `/transactions/${txHash}/logs`;

    try {
      const data = await callBlockscoutApi(chainId, path);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to get transaction internal transactions from Blockscout
server.tool(
  "blockscout_transaction_internal_txs",
  "Get internal transactions generated by a transaction from Blockscout.",
  {
    txHash: z.string().describe("The transaction hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ txHash, chainId }) => {
    const path = `/transactions/${txHash}/internal-transactions`;

    try {
      const data = await callBlockscoutApi(chainId, path);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to get transaction raw trace from Blockscout
server.tool(
  "blockscout_transaction_raw_trace",
  "Get the raw execution trace of a transaction from Blockscout (useful for debugging).",
  {
    txHash: z.string().describe("The transaction hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ txHash, chainId }) => {
    const path = `/transactions/${txHash}/raw-trace`;

    try {
      const data = await callBlockscoutApi(chainId, path);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to get transaction state changes from Blockscout
server.tool(
  "blockscout_transaction_state_changes",
  "Get state changes (storage slot updates) caused by a transaction from Blockscout.",
  {
    txHash: z.string().describe("The transaction hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ txHash, chainId }) => {
    const path = `/transactions/${txHash}/state-changes`;

    try {
      const data = await callBlockscoutApi(chainId, path);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// ============================================
// BLOCKSCOUT BLOCK TOOLS
// ============================================

// Tool to get block details from Blockscout
server.tool(
  "blockscout_block_details",
  "Get comprehensive information about a specific block from Blockscout.",
  {
    blockNumber: z.string().describe("The block number or hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ blockNumber, chainId }) => {
    const path = `/blocks/${blockNumber}`;

    try {
      const data = await callBlockscoutApi(chainId, path);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to get block transactions from Blockscout
server.tool(
  "blockscout_block_transactions",
  "Get all transactions included in a specific block from Blockscout.",
  {
    blockNumber: z.string().describe("The block number or hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of transactions to return (default: 50)")
    ),
  },
  async ({ blockNumber, chainId, limit }) => {
    const path = `/blocks/${blockNumber}/transactions`;
    const queryParams = new URLSearchParams();
    
    if (limit) queryParams.append("items_count", String(limit));

    try {
      const data = await callBlockscoutApi(chainId, path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to get latest blocks from Blockscout
server.tool(
  "blockscout_latest_blocks",
  "Get the most recent blocks from the blockchain via Blockscout.",
  {
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of blocks to return (default: 50)")
    ),
  },
  async ({ chainId, limit }) => {
    const path = "/blocks";
    const queryParams = new URLSearchParams();
    
    if (limit) queryParams.append("items_count", String(limit));

    try {
      const data = await callBlockscoutApi(chainId, path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// ============================================
// BLOCKSCOUT SMART CONTRACT TOOLS
// ============================================

// Tool to get smart contract information from Blockscout
server.tool(
  "blockscout_contract_info",
  "Get verified smart contract details including source code, ABI, and metadata from Blockscout.",
  {
    address: z.string().describe("The contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ address, chainId }) => {
    const path = `/smart-contracts/${address}`;

    try {
      const data = await callBlockscoutApi(chainId, path);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to get smart contract methods from Blockscout
server.tool(
  "blockscout_contract_methods",
  "Get readable and writable methods of a verified smart contract from Blockscout.",
  {
    address: z.string().describe("The contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ address, chainId }) => {
    const path = `/smart-contracts/${address}/methods-read`;

    try {
      const readMethods = await callBlockscoutApi(chainId, path);
      const writeMethods = await callBlockscoutApi(chainId, `/smart-contracts/${address}/methods-write`);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ readMethods, writeMethods }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to read smart contract state from Blockscout
server.tool(
  "blockscout_read_contract",
  "Call a read method on a verified smart contract and get the result from Blockscout.",
  {
    address: z.string().describe("The contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    method: z.string().describe("The method name to call"),
    args: z.array(z.any()).optional().describe("Optional. Array of arguments to pass to the method"),
  },
  async ({ address, chainId, method, args }) => {
    const path = `/smart-contracts/${address}/query-read-method`;
    const queryParams = new URLSearchParams();
    
    queryParams.append("method_id", method);
    if (args && args.length > 0) {
      args.forEach((arg, index) => {
        queryParams.append(`args[${index}]`, String(arg));
      });
    }

    try {
      const data = await callBlockscoutApi(chainId, path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to list verified smart contracts from Blockscout
server.tool(
  "blockscout_verified_contracts",
  "Get a list of recently verified smart contracts from Blockscout.",
  {
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    filter: z.string().optional().describe("Optional. Filter by verification type: 'solidity' | 'vyper' | 'yul'"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of contracts to return (default: 50)")
    ),
  },
  async ({ chainId, filter, limit }) => {
    const path = "/smart-contracts";
    const queryParams = new URLSearchParams();
    
    if (filter) queryParams.append("filter", filter);
    if (limit) queryParams.append("items_count", String(limit));

    try {
      const data = await callBlockscoutApi(chainId, path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// ============================================
// BLOCKSCOUT TOKEN & NFT TOOLS
// ============================================

// Tool to get token information from Blockscout
server.tool(
  "blockscout_token_info",
  "Get detailed information about a token including supply, decimals, and metadata from Blockscout.",
  {
    address: z.string().describe("The token contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ address, chainId }) => {
    const path = `/tokens/${address}`;

    try {
      const data = await callBlockscoutApi(chainId, path);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to get token transfers from Blockscout
server.tool(
  "blockscout_token_transfers",
  "Get token transfer history for a specific token from Blockscout.",
  {
    address: z.string().describe("The token contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of transfers to return (default: 50)")
    ),
    next_page_params: z.string().optional().describe("Optional. Pagination cursor from previous response"),
  },
  async ({ address, chainId, limit, next_page_params }) => {
    const path = `/tokens/${address}/transfers`;
    const queryParams = new URLSearchParams();
    
    if (limit) queryParams.append("items_count", String(limit));
    if (next_page_params) queryParams.append("next_page_params", next_page_params);

    try {
      const data = await callBlockscoutApi(chainId, path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to get token holders from Blockscout
server.tool(
  "blockscout_token_holders",
  "Get list of token holders for an ERC20 or ERC721 token from Blockscout.",
  {
    address: z.string().describe("The token contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of holders to return (default: 50)")
    ),
    next_page_params: z.string().optional().describe("Optional. Pagination cursor from previous response"),
  },
  async ({ address, chainId, limit, next_page_params }) => {
    const path = `/tokens/${address}/holders`;
    const queryParams = new URLSearchParams();
    
    if (limit) queryParams.append("items_count", String(limit));
    if (next_page_params) queryParams.append("next_page_params", next_page_params);

    try {
      const data = await callBlockscoutApi(chainId, path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to get NFT instances from Blockscout
server.tool(
  "blockscout_nft_instances",
  "Get individual NFT instances for an NFT collection from Blockscout.",
  {
    address: z.string().describe("The NFT collection contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    limit: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number().int().positive().optional().describe("Optional. Number of NFT instances to return (default: 50)")
    ),
    next_page_params: z.string().optional().describe("Optional. Pagination cursor from previous response"),
  },
  async ({ address, chainId, limit, next_page_params }) => {
    const path = `/tokens/${address}/instances`;
    const queryParams = new URLSearchParams();
    
    if (limit) queryParams.append("items_count", String(limit));
    if (next_page_params) queryParams.append("next_page_params", next_page_params);

    try {
      const data = await callBlockscoutApi(chainId, path, queryParams);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// Tool to get specific NFT metadata from Blockscout
server.tool(
  "blockscout_nft_metadata",
  "Get metadata for a specific NFT token ID from Blockscout.",
  {
    address: z.string().describe("The NFT collection contract address"),
    tokenId: z.string().describe("The specific NFT token ID"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ address, tokenId, chainId }) => {
    const path = `/tokens/${address}/instances/${tokenId}`;

    try {
      const data = await callBlockscoutApi(chainId, path);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: error.message }],
      };
    }
  }
);

// ============================================
// COMPOUND TOOLS - COMBINING DUNE + BLOCKSCOUT
// ============================================

// Compound tool: Smart Contract Deep Analysis
server.tool(
  "investigate_smart_contract",
  "Comprehensive smart contract analysis combining real-time data from Blockscout with historical analytics from Dune.",
  {
    contractAddress: z.string().describe("The smart contract address to investigate"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ contractAddress, chainId }) => {
    try {
      // Fetch data from both sources in parallel
      const [blockscoutInfo, blockscoutMethods, duneTokenInfo] = await Promise.all([
        // Get contract info from Blockscout
        callBlockscoutApi(chainId, `/smart-contracts/${contractAddress}`).catch(err => ({ error: err.message })),
        // Get contract methods from Blockscout
        callBlockscoutApi(chainId, `/smart-contracts/${contractAddress}/methods-read`)
          .then(readMethods => 
            callBlockscoutApi(chainId, `/smart-contracts/${contractAddress}/methods-write`)
              .then(writeMethods => ({ readMethods, writeMethods }))
          )
          .catch(err => ({ error: err.message })),
        // Get token analytics from Dune if available
        callDuneApi(`/v1/evm/token-info/${chainId}/${contractAddress}`, new URLSearchParams({ chain_ids: chainId }))
          .catch(err => ({ error: err.message }))
      ]) as [any, any, any];

      // Combine the results
      const analysis = {
        contract: {
          address: contractAddress,
          chainId: chainId,
          network: BLOCKSCOUT_NETWORKS[chainId]?.name || `Chain ${chainId}`,
        },
        realTimeData: {
          contractInfo: blockscoutInfo,
          methods: blockscoutMethods,
        },
        analytics: {
          tokenMetrics: duneTokenInfo,
        },
        summary: {
          isVerified: blockscoutInfo?.is_verified || false,
          hasTokenInfo: !duneTokenInfo?.error,
          contractType: blockscoutInfo?.proxy_type || "standard",
          language: blockscoutInfo?.language || "unknown",
        }
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(analysis, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error analyzing contract: ${error.message}` }],
      };
    }
  }
);

// Compound tool: Transaction Impact Analysis
server.tool(
  "analyze_transaction_impact",
  "Deep dive into a transaction's full impact by combining Blockscout's detailed traces with Dune's wallet context.",
  {
    txHash: z.string().describe("The transaction hash to analyze"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ txHash, chainId }) => {
    try {
      // First get transaction details from Blockscout
      const txDetails: any = await callBlockscoutApi(chainId, `/transactions/${txHash}`);
      
      // Fetch additional transaction data in parallel
      const [txLogs, txInternalTxs, txStateChanges, senderActivity, receiverActivity] = await Promise.all([
        // Get logs from Blockscout
        callBlockscoutApi(chainId, `/transactions/${txHash}/logs`).catch(err => ({ error: err.message })),
        // Get internal transactions
        callBlockscoutApi(chainId, `/transactions/${txHash}/internal-transactions`).catch(err => ({ error: err.message })),
        // Get state changes
        callBlockscoutApi(chainId, `/transactions/${txHash}/state-changes`).catch(err => ({ error: err.message })),
        // Get sender's recent activity from Dune
        txDetails.from?.hash ? 
          callDuneApi(`/v1/evm/activity/${txDetails.from.hash}`, new URLSearchParams({ limit: "5" }))
            .catch(err => ({ error: err.message })) : null,
        // Get receiver's recent activity from Dune (if not a contract creation)
        txDetails.to?.hash && !txDetails.to.is_contract ? 
          callDuneApi(`/v1/evm/activity/${txDetails.to.hash}`, new URLSearchParams({ limit: "5" }))
            .catch(err => ({ error: err.message })) : null,
      ]);

      // Analyze the impact
      const impact = {
        transaction: {
          hash: txHash,
          chainId: chainId,
          network: BLOCKSCOUT_NETWORKS[chainId]?.name || `Chain ${chainId}`,
          status: txDetails.status,
          timestamp: txDetails.timestamp,
          blockNumber: txDetails.block,
        },
        participants: {
          from: {
            address: txDetails.from?.hash,
            isContract: txDetails.from?.is_contract,
            recentActivity: senderActivity,
          },
          to: {
            address: txDetails.to?.hash,
            isContract: txDetails.to?.is_contract,
            recentActivity: receiverActivity,
          },
        },
        execution: {
          gasUsed: txDetails.gas_used,
          gasPrice: txDetails.gas_price,
          value: txDetails.value,
          fee: txDetails.fee?.value,
        },
        effects: {
          logs: txLogs,
          internalTransactions: txInternalTxs,
          stateChanges: txStateChanges,
          tokenTransfers: txDetails.token_transfers,
        },
        analysis: {
          complexity: (txInternalTxs as any)?.items?.length > 0 ? "complex" : "simple",
          hasTokenTransfers: txDetails.token_transfers?.length > 0,
          hasStateChanges: (txStateChanges as any)?.items?.length > 0,
          eventCount: (txLogs as any)?.items?.length || 0,
        }
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(impact, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error analyzing transaction: ${error.message}` }],
      };
    }
  }
);

// Compound tool: Token Forensics
server.tool(
  "token_deep_analysis",
  "Comprehensive token analysis combining real-time transfers from Blockscout with holder analytics from Dune.",
  {
    tokenAddress: z.string().describe("The token contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ tokenAddress, chainId }) => {
    try {
      // Fetch data from both sources in parallel
      const [
        blockscoutTokenInfo,
        blockscoutTransfers,
        blockscoutHolders,
        duneTokenInfo,
        duneHolders
      ] = await Promise.all([
        // Blockscout data
        callBlockscoutApi(chainId, `/tokens/${tokenAddress}`).catch(err => ({ error: err.message })),
        callBlockscoutApi(chainId, `/tokens/${tokenAddress}/transfers`, new URLSearchParams({ items_count: "10" }))
          .catch(err => ({ error: err.message })),
        callBlockscoutApi(chainId, `/tokens/${tokenAddress}/holders`, new URLSearchParams({ items_count: "10" }))
          .catch(err => ({ error: err.message })),
        // Dune data
        callDuneApi(`/v1/evm/token-info/${chainId}/${tokenAddress}`, new URLSearchParams({ chain_ids: chainId }))
          .catch(err => ({ error: err.message })),
        callDuneApi(`/v1/evm/token-holders/${chainId}/${tokenAddress}`, new URLSearchParams({ limit: "10" }))
          .catch(err => ({ error: err.message }))
      ]) as [any, any, any, any, any];

      // Analyze holder concentration
      const holderAnalysis = {
        concentration: "unknown",
        topHolderPercentage: 0,
      };
      
      if (duneHolders?.items?.length > 0) {
        const top10Balance = duneHolders.items.reduce((sum: number, holder: any) => 
          sum + parseFloat(holder.percentage_of_total_supply || "0"), 0
        );
        holderAnalysis.concentration = top10Balance > 50 ? "high" : top10Balance > 25 ? "medium" : "low";
        holderAnalysis.topHolderPercentage = top10Balance;
      }

      const forensics = {
        token: {
          address: tokenAddress,
          chainId: chainId,
          network: BLOCKSCOUT_NETWORKS[chainId]?.name || `Chain ${chainId}`,
        },
        basicInfo: {
          name: blockscoutTokenInfo?.name || duneTokenInfo?.name,
          symbol: blockscoutTokenInfo?.symbol || duneTokenInfo?.symbol,
          decimals: blockscoutTokenInfo?.decimals || duneTokenInfo?.decimals,
          type: blockscoutTokenInfo?.type || duneTokenInfo?.type,
          totalSupply: blockscoutTokenInfo?.total_supply || duneTokenInfo?.total_supply,
        },
        marketMetrics: {
          price: duneTokenInfo?.current_price,
          marketCap: duneTokenInfo?.market_cap || blockscoutTokenInfo?.circulating_market_cap,
          volume24h: duneTokenInfo?.volume_24h || blockscoutTokenInfo?.volume_24h,
          holderCount: blockscoutTokenInfo?.holders_count || duneTokenInfo?.holder_count,
        },
        activity: {
          recentTransfers: blockscoutTransfers,
          transferCount24h: blockscoutTokenInfo?.counters?.transfers_count_24h,
        },
        holders: {
          topHoldersBlockscout: blockscoutHolders,
          topHoldersDune: duneHolders,
          analysis: holderAnalysis,
        },
        risks: {
          isVerified: !blockscoutTokenInfo?.error && blockscoutTokenInfo?.address !== undefined,
          hasLiquidity: duneTokenInfo?.volume_24h > 0,
          holderConcentration: holderAnalysis.concentration,
          warnings: [] as string[]
        }
      };

      // Add risk warnings
      if (holderAnalysis.concentration === "high") {
        forensics.risks.warnings.push("High holder concentration - top 10 holders own >50% of supply");
      }
      if (!forensics.risks.isVerified) {
        forensics.risks.warnings.push("Token contract not found or not verified");
      }
      if (!forensics.risks.hasLiquidity) {
        forensics.risks.warnings.push("Low or no trading volume in last 24h");
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(forensics, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error analyzing token: ${error.message}` }],
      };
    }
  }
);

// Compound tool: Wallet Behavior Profiler
server.tool(
  "profile_wallet_behavior",
  "Create a comprehensive behavioral profile of a wallet by combining real-time activity from Blockscout with historical patterns from Dune.",
  {
    walletAddress: z.string().describe("The wallet address to profile"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
  },
  async ({ walletAddress, chainId }) => {
    try {
      // Fetch comprehensive wallet data from both sources
      const [
        blockscoutInfo,
        blockscoutTxs,
        blockscoutTokens,
        blockscoutInternalTxs,
        duneBalances,
        duneActivity
      ] = await Promise.all([
        // Blockscout data
        callBlockscoutApi(chainId, `/addresses/${walletAddress}`).catch(err => ({ error: err.message })),
        callBlockscoutApi(chainId, `/addresses/${walletAddress}/transactions`, new URLSearchParams({ items_count: "20" }))
          .catch(err => ({ error: err.message })),
        callBlockscoutApi(chainId, `/addresses/${walletAddress}/tokens`).catch(err => ({ error: err.message })),
        callBlockscoutApi(chainId, `/addresses/${walletAddress}/internal-transactions`, new URLSearchParams({ items_count: "10" }))
          .catch(err => ({ error: err.message })),
        // Dune data
        callDuneApi(`/v1/evm/balances/${walletAddress}`, new URLSearchParams({ chain_ids: chainId }))
          .catch(err => ({ error: err.message })),
        callDuneApi(`/v1/evm/activity/${walletAddress}`, new URLSearchParams({ limit: "20" }))
          .catch(err => ({ error: err.message }))
      ]) as [any, any, any, any, any, any];

      // Analyze transaction patterns
      const txPatterns = {
        totalTransactions: blockscoutInfo?.transaction_count || 0,
        contractInteractions: 0,
        uniqueContracts: new Set(),
        transfersIn: 0,
        transfersOut: 0,
      };

      if (blockscoutTxs?.items) {
        blockscoutTxs.items.forEach((tx: any) => {
          if (tx.to?.is_contract) {
            txPatterns.contractInteractions++;
            txPatterns.uniqueContracts.add(tx.to.hash);
          }
          if (tx.from?.hash?.toLowerCase() === walletAddress.toLowerCase()) {
            txPatterns.transfersOut++;
          } else {
            txPatterns.transfersIn++;
          }
        });
      }

      // Analyze token portfolio
      const portfolio = {
        nativeBalance: blockscoutInfo?.coin_balance,
        tokenCount: 0,
        nftCount: 0,
        defiTokens: 0,
        stablecoins: 0,
      };

      if (duneBalances?.items) {
        duneBalances.items.forEach((token: any) => {
          portfolio.tokenCount++;
          if (token.token_type === "ERC721" || token.token_type === "ERC1155") {
            portfolio.nftCount++;
          }
          // Check for stablecoins
          if (["USDC", "USDT", "DAI", "BUSD"].includes(token.symbol?.toUpperCase())) {
            portfolio.stablecoins++;
          }
          // Simple DeFi token detection
          if (token.symbol?.toLowerCase().includes("lp") || 
              token.name?.toLowerCase().includes("liquidity") ||
              token.name?.toLowerCase().includes("vault")) {
            portfolio.defiTokens++;
          }
        });
      }

      // Create behavioral profile
      const profile = {
        wallet: {
          address: walletAddress,
          chainId: chainId,
          network: BLOCKSCOUT_NETWORKS[chainId]?.name || `Chain ${chainId}`,
          ens: blockscoutInfo?.ens_domain_name,
          createdAt: blockscoutInfo?.creation_transaction_hash ? "tracked" : "unknown",
        },
        activity: {
          firstSeen: blockscoutInfo?.creation_transaction_hash,
          totalTransactions: txPatterns.totalTransactions,
          contractInteractions: txPatterns.contractInteractions,
          uniqueContractsUsed: txPatterns.uniqueContracts.size,
          recentTransactions: blockscoutTxs,
          internalTransactions: blockscoutInternalTxs,
        },
        portfolio: portfolio,
        behavior: {
          type: determineWalletType(txPatterns, portfolio),
          activityLevel: txPatterns.totalTransactions > 1000 ? "high" : 
                        txPatterns.totalTransactions > 100 ? "medium" : "low",
          primaryUse: determinePrimaryUse(txPatterns, portfolio),
        },
        duneMetrics: {
          balances: duneBalances,
          recentActivity: duneActivity,
        }
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(profile, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error profiling wallet: ${error.message}` }],
      };
    }
  }
);

// Helper function to determine wallet type
function determineWalletType(txPatterns: any, portfolio: any): string {
  if (portfolio.nftCount > portfolio.tokenCount * 0.5) return "NFT Collector";
  if (portfolio.defiTokens > 2) return "DeFi User";
  if (txPatterns.contractInteractions > txPatterns.totalTransactions * 0.7) return "Smart Contract Power User";
  if (portfolio.stablecoins > portfolio.tokenCount * 0.5) return "Stablecoin Holder";
  if (txPatterns.totalTransactions < 10) return "New/Inactive Wallet";
  return "General User";
}

// Helper function to determine primary wallet use
function determinePrimaryUse(txPatterns: any, portfolio: any): string {
  const uses = [];
  if (portfolio.nftCount > 0) uses.push("NFT Trading");
  if (portfolio.defiTokens > 0) uses.push("DeFi");
  if (portfolio.stablecoins > 0) uses.push("Stablecoin Transactions");
  if (txPatterns.contractInteractions > 10) uses.push("dApp Interactions");
  if (uses.length === 0) uses.push("Basic Transfers");
  return uses.join(", ");
}

// ============================================
// RESOURCES
// ============================================

// Resource for Unified Network Support
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

// Resource for EVM Supported Chains (Dune)
server.resource(
  "dune_evm_supported_chains", // Internal registration name
  "dune://evm/supported-chains", // The URI clients will use to request this resource
  { // ResourceDefinition for discovery (metadata)
    name: "Dune EVM Supported Chains",
    description: "Provides a list of EVM chains supported by the Dune API and their capabilities per endpoint.",
    mimeType: "application/json"
  },
  async (uri) => { // Handler function
    const path = "/v1/evm/supported-chains";
    try {
      const data = await callDuneApi(path);
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2),
        }],
      };
    } catch (error: any) {
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/plain",
          text: error.message, // Error message from callDuneApi is already detailed
        }],
      };
    }
  }
);

// ============================================
// BLOCKCHAIN REFERENCE RESOURCES
// ============================================

// Resource: Major DEX Router Contracts
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

// Resource: Stablecoin Addresses
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

// Resource: Bridge Contracts
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

// Resource: Security Patterns and Known Issues
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

// Resource: Token Lists and Categories
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

// ============================================
// MCP PROMPTS
// ============================================

// Enhanced wallet overview using both APIs
server.prompt(
  "comprehensive_wallet_analysis",
  "Perform a deep analysis of a wallet using both Blockscout and Dune APIs for comprehensive insights.",
  {
    walletAddress: z.string().describe("The wallet address to analyze"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)")
  },
  ({ walletAddress, chainId }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please perform a comprehensive analysis of wallet ${walletAddress} on chain ${chainId}. I need:
1. A behavioral profile of the wallet
2. Current portfolio composition
3. Recent transaction patterns
4. Risk assessment`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll perform a comprehensive analysis using the 'profile_wallet_behavior' tool which combines data from both Blockscout and Dune APIs to give you detailed insights about wallet ${walletAddress} on chain ${chainId}.`
          }
        }
      ]
    };
  }
);

// Smart contract investigation prompt
server.prompt(
  "smart_contract_deep_dive",
  "Investigate a smart contract thoroughly using combined Blockscout and Dune data.",
  {
    contractAddress: z.string().describe("The smart contract address to investigate"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)")
  },
  ({ contractAddress, chainId }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `I need a thorough investigation of smart contract ${contractAddress} on chain ${chainId}. Please provide:
1. Contract verification status and source code availability
2. Available read/write methods
3. Token metrics if applicable
4. Recent usage patterns`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll investigate smart contract ${contractAddress} on chain ${chainId} using the 'investigate_smart_contract' tool, which combines real-time Blockscout data with Dune analytics to provide comprehensive contract analysis.`
          }
        }
      ]
    };
  }
);

// Token forensics prompt
server.prompt(
  "token_risk_assessment",
  "Perform a detailed risk assessment of a token using multi-source analysis.",
  {
    tokenAddress: z.string().describe("The token contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)")
  },
  ({ tokenAddress, chainId }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please perform a comprehensive risk assessment of token ${tokenAddress} on chain ${chainId}. I need to understand:
1. Holder concentration and distribution
2. Recent transfer activity
3. Liquidity and trading volume
4. Any red flags or warnings`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll perform a detailed token analysis using the 'token_deep_analysis' tool for ${tokenAddress} on chain ${chainId}. This will combine real-time transfer data from Blockscout with holder analytics from Dune to provide a comprehensive risk assessment.`
          }
        }
      ]
    };
  }
);

// Transaction impact analysis prompt
server.prompt(
  "transaction_post_mortem",
  "Analyze a transaction's full impact and context using advanced tools.",
  {
    txHash: z.string().describe("The transaction hash to analyze"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)")
  },
  ({ txHash, chainId }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please analyze transaction ${txHash} on chain ${chainId}. I want to understand:
1. What exactly happened in this transaction
2. All internal transactions and state changes
3. Context about the sender and receiver
4. Overall impact and complexity`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll analyze transaction ${txHash} on chain ${chainId} using the 'analyze_transaction_impact' tool, which provides deep insights by combining Blockscout's detailed traces with Dune's wallet context data.`
          }
        }
      ]
    };
  }
);

// Network comparison prompt
server.prompt(
  "compare_networks",
  "Compare supported networks and their API capabilities.",
  {},
  () => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Show me all supported blockchain networks and compare which APIs (Dune vs Blockscout) are available for each chain.`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll fetch the unified network support information that shows all supported chains and their API availability across both Dune and Blockscout.`
          }
        }
      ]
    };
  }
);

// ============================================
// ADVANCED ANALYSIS PROMPTS
// ============================================

// DeFi Protocol Investigation
server.prompt(
  "defi_protocol_investigation",
  "Investigate a DeFi protocol by analyzing its core contracts, TVL, and user activity patterns.",
  {
    protocolName: z.string().describe("The name of the DeFi protocol (e.g., 'Uniswap', 'Aave')"),
    mainContract: z.string().describe("The main protocol contract address"),
    chainId: z.string().describe("The chain ID where the protocol operates")
  },
  ({ protocolName, mainContract, chainId }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Investigate the ${protocolName} DeFi protocol on chain ${chainId}. Main contract: ${mainContract}. I need:
1. Contract verification and security analysis
2. Top users and their activity patterns
3. Token flows and liquidity analysis
4. Recent significant transactions
5. Risk assessment and red flags`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll conduct a comprehensive investigation of ${protocolName} using multiple analysis tools to examine the contract, user patterns, and transaction flows.`
          }
        }
      ]
    };
  }
);

// Token Launch Forensics
server.prompt(
  "token_launch_investigation",
  "Perform forensic analysis on a newly launched token to identify potential risks or scams.",
  {
    tokenAddress: z.string().describe("The token contract address"),
    chainId: z.string().describe("The chain ID"),
    launchDate: z.string().optional().describe("Optional: The token launch date (YYYY-MM-DD)")
  },
  ({ tokenAddress, chainId, launchDate }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Perform a forensic investigation of token ${tokenAddress} on chain ${chainId}${launchDate ? ` launched on ${launchDate}` : ''}. Check for:
1. Contract code red flags (minting, pause, blacklist functions)
2. Initial distribution and holder concentration
3. Liquidity pool analysis and locks
4. Developer wallet activity
5. Similar contract deployments by same deployer
6. Social engineering indicators`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll perform a comprehensive forensic analysis to identify any potential risks or scam indicators for this token launch.`
          }
        }
      ]
    };
  }
);

// Whale Activity Tracker
server.prompt(
  "whale_movement_analysis",
  "Track and analyze large holder (whale) movements for a specific token or protocol.",
  {
    tokenAddress: z.string().describe("The token contract address to monitor"),
    chainId: z.string().describe("The chain ID"),
    threshold: z.string().optional().describe("Optional: Minimum USD value to consider as whale activity (default: $100,000)")
  },
  ({ tokenAddress, chainId, threshold }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Track whale movements for token ${tokenAddress} on chain ${chainId}${threshold ? ` with threshold ${threshold}` : ''}. Analyze:
1. Large holder list and concentration changes
2. Recent significant transfers (in/out)
3. Accumulation or distribution patterns
4. Correlation with price movements
5. Cross-protocol activity by whales`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll analyze whale activity and large holder movements to identify accumulation/distribution patterns and their market impact.`
          }
        }
      ]
    };
  }
);

// NFT Collection Deep Analysis
server.prompt(
  "nft_collection_forensics",
  "Comprehensive analysis of an NFT collection including rarity, trading patterns, and holder behavior.",
  {
    collectionAddress: z.string().describe("The NFT collection contract address"),
    chainId: z.string().describe("The chain ID"),
    includeRarity: z.string().optional().describe("Optional: Include rarity analysis - 'true' or 'false' (default: true)")
  },
  ({ collectionAddress, chainId, includeRarity }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Analyze NFT collection ${collectionAddress} on chain ${chainId}. Include:
1. Collection metadata and verified status
2. Holder distribution and concentration
3. Trading volume and floor price trends
4. Wash trading detection
5. Blue chip holder overlap
${includeRarity !== 'false' ? '6. Rarity distribution analysis' : ''}`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll perform a comprehensive NFT collection analysis including holder patterns, trading activity, and market dynamics.`
          }
        }
      ]
    };
  }
);

// Cross-Chain Bridge Analysis
server.prompt(
  "bridge_transaction_verification",
  "Verify and analyze cross-chain bridge transactions for security and completion status.",
  {
    bridgeContract: z.string().describe("The bridge contract address"),
    txHash: z.string().optional().describe("Optional: Specific transaction to verify"),
    sourceChain: z.string().describe("Source chain ID"),
    targetChain: z.string().optional().describe("Optional: Target chain ID")
  },
  ({ bridgeContract, txHash, sourceChain, targetChain }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Analyze bridge ${bridgeContract} on chain ${sourceChain}${targetChain ? ` bridging to chain ${targetChain}` : ''}${txHash ? ` for transaction ${txHash}` : ''}. Check:
1. Bridge contract verification and security
2. Recent bridge transactions and success rate
3. Liquidity on both sides
4. Fee structure analysis
5. Known security incidents
${txHash ? '6. Specific transaction status and verification' : '6. Pending/stuck transactions'}`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll analyze the bridge contract and transactions to verify security and operational status.`
          }
        }
      ]
    };
  }
);

// MEV Transaction Detection
server.prompt(
  "mev_activity_detection",
  "Detect and analyze MEV (Maximum Extractable Value) activity including sandwich attacks and arbitrage.",
  {
    targetAddress: z.string().optional().describe("Optional: Specific address or contract to monitor"),
    chainId: z.string().describe("The chain ID"),
    blockRange: z.string().optional().describe("Optional: Block range to analyze (e.g., 'latest-100')")
  },
  ({ targetAddress, chainId, blockRange }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Detect MEV activity on chain ${chainId}${targetAddress ? ` involving ${targetAddress}` : ''}${blockRange ? ` in blocks ${blockRange}` : ' in recent blocks'}. Identify:
1. Sandwich attacks (front-run + back-run patterns)
2. Arbitrage transactions across DEXes
3. Liquidation races
4. NFT MEV (trait sniping, floor sweeping)
5. MEV bot identification and profit analysis`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll scan for MEV patterns including sandwich attacks, arbitrage, and other extractable value activities.`
          }
        }
      ]
    };
  }
);

// Gas Optimization Analysis
server.prompt(
  "gas_optimization_audit",
  "Analyze gas usage patterns and identify optimization opportunities for contracts or users.",
  {
    address: z.string().describe("Contract or wallet address to analyze"),
    chainId: z.string().describe("The chain ID"),
    timeframe: z.string().optional().describe("Optional: Analysis timeframe (e.g., '7d', '30d')")
  },
  ({ address, chainId, timeframe }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Perform gas optimization analysis for ${address} on chain ${chainId}${timeframe ? ` over ${timeframe}` : ''}. Analyze:
1. Gas consumption by function/transaction type
2. Comparison with similar contracts/users
3. Peak vs off-peak usage patterns
4. Failed transaction gas waste
5. Specific optimization recommendations
6. Estimated savings potential`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll analyze gas usage patterns and identify specific optimization opportunities to reduce transaction costs.`
          }
        }
      ]
    };
  }
);

// DAO Treasury Analysis
server.prompt(
  "dao_treasury_audit",
  "Comprehensive audit of a DAO treasury including assets, spending, and governance.",
  {
    treasuryAddress: z.string().describe("The DAO treasury address"),
    chainId: z.string().describe("The chain ID"),
    governanceContract: z.string().optional().describe("Optional: Governance contract address")
  },
  ({ treasuryAddress, chainId, governanceContract }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Audit DAO treasury ${treasuryAddress} on chain ${chainId}${governanceContract ? ` with governance ${governanceContract}` : ''}. Analyze:
1. Current asset composition and diversification
2. Inflow/outflow patterns and burn rate
3. Large transactions and approval process
4. Yield generation strategies
5. Risk assessment (concentration, liquidity)
6. Governance participation and proposal history`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll conduct a comprehensive treasury audit analyzing assets, spending patterns, and governance effectiveness.`
          }
        }
      ]
    };
  }
);

// Smart Contract Security Scanner
server.prompt(
  "security_vulnerability_scan",
  "Scan smart contracts for common vulnerabilities and security best practices.",
  {
    contractAddress: z.string().describe("The contract address to scan"),
    chainId: z.string().describe("The chain ID"),
    checkUpgradeable: z.string().optional().describe("Optional: Check for upgradeable proxy patterns - 'true' or 'false'")
  },
  ({ contractAddress, chainId, checkUpgradeable }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Perform security scan on contract ${contractAddress} on chain ${chainId}. Check for:
1. Contract verification status and source code
2. Common vulnerabilities (reentrancy, overflow, access control)
3. Centralization risks (owner privileges, pause functions)
4. External dependencies and composability risks
${checkUpgradeable === 'true' ? '5. Upgradeable proxy implementation security' : '5. Immutability verification'}
6. Historical security incidents`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll scan the contract for security vulnerabilities and analyze potential risks in the implementation.`
          }
        }
      ]
    };
  }
);

// DeFi Yield Strategy Analysis
server.prompt(
  "yield_strategy_comparison",
  "Compare and analyze DeFi yield strategies across protocols.",
  {
    asset: z.string().describe("The asset to analyze (e.g., 'USDC', 'ETH')"),
    chainId: z.string().describe("The chain ID"),
    minTvl: z.string().optional().describe("Optional: Minimum TVL for protocols to consider")
  },
  ({ asset, chainId, minTvl }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Compare yield strategies for ${asset} on chain ${chainId}${minTvl ? ` with minimum TVL ${minTvl}` : ''}. Analyze:
1. Current yield rates across protocols
2. Risk assessment (smart contract, liquidity, impermanent loss)
3. Gas costs and minimum viable amounts
4. Historical yield stability
5. Composability opportunities
6. Optimal strategy recommendations`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `I'll analyze and compare yield opportunities across DeFi protocols to identify optimal strategies for ${asset}.`
          }
        }
      ]
    };
  }
);

// Legacy prompts for backward compatibility
server.prompt(
  "evm_wallet_overview",
  {
    walletAddress: z.string().describe("The EVM wallet address to get an overview for.")
  },
  ({ walletAddress }) => { // Callback receives validated arguments
    return {
      // Optional: A description of what this prompt invocation will do, can be shown to user.
      // description: `Generating an overview for EVM wallet ${walletAddress}...`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please provide an overview for EVM wallet ${walletAddress}. I'm interested in its current token balances and a summary of its 5 most recent activities. Present the balances first, then the activity summary.`
          }
        },
        {
          role: "assistant", // This pre-fills the assistant's first response, guiding it.
          content: {
            type: "text",
            text: `Okay, I will use the 'get_evm_balances' tool to fetch token balances and the 'get_evm_activity' tool (with a limit of 5) to get recent activity for ${walletAddress}. Then I will summarize the findings.`
          }
        }
      ]
    };
  }
);

server.prompt(
  "analyze_erc20_token",
  "Analyze a specific ERC20 token, showing its information and top 10 holders.", // Description string
  {
    chainId: z.string().describe("The chain ID where the token resides (e.g., '1' for Ethereum). Input as a string."),
    tokenAddress: z.string().describe("The ERC20 token contract address.")
  },
  ({ chainId, tokenAddress }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `I need a detailed analysis of the ERC20 token ${tokenAddress} on chain ${chainId}. Please fetch its token information and list its top 10 holders.`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Understood. I will use 'get_evm_token_info' for chain ${chainId} and token ${tokenAddress} (using chainId ${chainId} for the chain_ids parameter), and then 'get_evm_token_holders' for the same chain and token with a limit of 10. I will then present this information.`
          }
        }
      ]
    };
  }
);

server.prompt(
  "svm_address_check",
  "Check basic information for an SVM address, including balances and its 3 most recent transactions.",
  {
    walletAddress: z.string().describe("The SVM wallet address to check.")
  },
  ({ walletAddress }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please provide a quick check for the SVM address ${walletAddress}. Show me its token balances (for Solana by default) and its 3 most recent transactions.`
          }
        },
        {
          role: "assistant",
          content: {
            type: "text",
            text: `Okay, I will use 'get_svm_balances' (defaulting to Solana chain) and 'get_svm_transactions' (with a limit of 3) for the address ${walletAddress} and summarize the results.`
          }
        }
      ]
    };
  }
);

async function main() {
  // Check for CLI arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`MCP Web3 Stats v${VERSION}`);
    process.exit(0);
  }
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
MCP Web3 Stats - MCP Server for Dune API to analyze blockchain data

USAGE:
  mcp-web3-stats [OPTIONS]

OPTIONS:
  -h, --help     Show this help message
  -v, --version  Show version information

ENVIRONMENT:
  DUNE_API_KEY   Required API key for the Dune API (https://docs.sim.dune.com/)

DESCRIPTION:
  This MCP server exposes functionality from the Dune API, allowing LLM agents
  and other MCP clients to analyze blockchain information.
    `);
    process.exit(0);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`MCP Web3 Stats v${VERSION} started and listening on stdio.`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Shutting down server...');
  process.exit(0);
});

main().catch((error) => {
  console.error("Failed to start MCP Web3 Stats Server:", error);
  process.exit(1);
});