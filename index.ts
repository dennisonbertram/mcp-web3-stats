import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";

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

const server = new McpServer({
  name: "DuneAPIAnalyzer",
  version: "0.1.0",
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
  "Fetches EVM token balances for a given wallet address from the Dune API.",
  {
    walletAddress: z.string().describe("The EVM wallet address (e.g., 0xd8da6bf26964af9d7eed9e03e53415d37aa96045)"),
    // TODO: Add optional parameters like chainIds, excludeSpamTokens, metadata, limit, offset in the future
  },
  async ({ walletAddress }) => {
    const path = `/v1/evm/balances/${walletAddress}`;
    // const queryParams = new URLSearchParams(); // No specific query params for base balances yet
    try {
      const data = await callDuneApi(path /*, queryParams */);
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
  "Fetches EVM account activity for a given wallet address from the Dune API.",
  {
    walletAddress: z.string().describe("The EVM wallet address (e.g., 0xd8da6bf26964af9d7eed9e03e53415d37aa96045)"),
    limit: z.number().optional().describe("Optional. Number of activity items to return. Defaults to 25."),
    // TODO: Add optional parameter like offset and exclude_spam_tokens in the future
  },
  async ({ walletAddress, limit }) => {
    const path = `/v1/evm/activity/${walletAddress}`;
    const queryParams = new URLSearchParams();
    if (limit !== undefined) {
      queryParams.append("limit", String(limit));
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
  "Fetches EVM NFT collectibles (ERC721 and ERC1155) for a given wallet address from the Dune API.",
  {
    walletAddress: z.string().describe("The EVM wallet address (e.g., 0xd8da6bf26964af9d7eed9e03e53415d37aa96045)"),
    limit: z.number().optional().describe("Optional. Number of collectible items to return. Defaults to 50."),
    // TODO: Add optional parameter like offset in the future
  },
  async ({ walletAddress, limit }) => {
    const path = `/v1/evm/collectibles/${walletAddress}`;
    const queryParams = new URLSearchParams();
    if (limit !== undefined) {
      queryParams.append("limit", String(limit));
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

// Resource for EVM Supported Chains
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Dune API MCP Server (Stdio) started and listening."); // Log to stderr for stdio transport
}

main().catch((error) => {
  console.error("Failed to start Dune API MCP Server:", error);
  process.exit(1);
});