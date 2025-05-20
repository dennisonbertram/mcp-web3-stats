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
    const duneApiBaseUrl = "https://api.sim.dune.com/v1";
    const url = `${duneApiBaseUrl}/evm/balances/${walletAddress}`;

    try {
      console.error(`Fetching EVM balances for ${walletAddress} from ${url}`); // Log to stderr
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
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error fetching balances from Dune API: ${response.status} ${response.statusText}. Details: ${errorBody}`,
            },
          ],
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error(`Error calling Dune API for get_evm_balances: ${error.message}`);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `An unexpected error occurred: ${error.message}`,
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
    const duneApiBaseUrl = "https://api.sim.dune.com/v1";
    let url = `${duneApiBaseUrl}/evm/activity/${walletAddress}`;

    if (limit !== undefined) {
      url += `?limit=${limit}`;
    }

    try {
      console.error(`Fetching EVM activity for ${walletAddress} from ${url}`);
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
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error fetching activity from Dune API: ${response.status} ${response.statusText}. Details: ${errorBody}`,
            },
          ],
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error(`Error calling Dune API for get_evm_activity: ${error.message}`);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `An unexpected error occurred: ${error.message}`,
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
    const duneApiBaseUrl = "https://api.sim.dune.com/v1";
    let url = `${duneApiBaseUrl}/evm/collectibles/${walletAddress}`;

    if (limit !== undefined) {
      url += `?limit=${limit}`;
    }

    try {
      console.error(`Fetching EVM collectibles for ${walletAddress} from ${url}`);
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
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error fetching collectibles from Dune API: ${response.status} ${response.statusText}. Details: ${errorBody}`,
            },
          ],
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error(`Error calling Dune API for get_evm_collectibles: ${error.message}`);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `An unexpected error occurred: ${error.message}`,
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
    const duneApiBaseUrl = "https://api.sim.dune.com/v1";
    let url = `${duneApiBaseUrl}/evm/transactions/${walletAddress}`;
    const queryParams = new URLSearchParams();

    if (limit !== undefined) {
      queryParams.append("limit", String(limit));
    }
    if (offset !== undefined) {
      queryParams.append("offset", offset);
    }

    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    try {
      console.error(`Fetching EVM transactions for ${walletAddress} from ${url}`);
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
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error fetching transactions from Dune API: ${response.status} ${response.statusText}. Details: ${errorBody}`,
            },
          ],
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error(`Error calling Dune API for get_evm_transactions: ${error.message}`);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `An unexpected error occurred: ${error.message}`,
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
    const duneApiBaseUrl = "https://api.sim.dune.com/v1";
    let url = `${duneApiBaseUrl}/evm/token-info/${chainAndTokenUri}`;
    const queryParams = new URLSearchParams();

    queryParams.append("chain_ids", chainIds); // Mandatory parameter

    if (limit !== undefined) {
      queryParams.append("limit", String(limit));
    }
    if (offset !== undefined) {
      queryParams.append("offset", offset);
    }

    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    try {
      console.error(`Fetching EVM token info for ${chainAndTokenUri} from ${url}`);
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
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error fetching token info from Dune API: ${response.status} ${response.statusText}. Details: ${errorBody}`,
            },
          ],
        };
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error(`Error calling Dune API for get_evm_token_info: ${error.message}`);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `An unexpected error occurred: ${error.message}`,
          },
        ],
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