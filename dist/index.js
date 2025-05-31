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
async function callDuneApi(path, queryParams) {
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
            "X-Sim-Api-Key": DUNE_API_KEY,
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
const BLOCKSCOUT_NETWORKS = {
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
async function callBlockscoutApi(chainId, path, queryParams) {
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
server.tool("ping_dune_server", "A simple tool to check if the Dune MCP server is responsive.", {}, async () => {
    return {
        content: [{ type: "text", text: "Pong! Dune MCP server is active." }],
    };
});
// Tool to get EVM token balances
server.tool("get_evm_balances", "Fetches EVM token balances for a given wallet address from the Dune API. Supports chain filtering, metadata inclusion, spam filtering, and pagination.", {
    walletAddress: z.string().describe("The EVM wallet address (e.g., 0xd8da6bf26964af9d7eed9e03e53415d37aa96045)"),
    chainIds: z.string().optional().describe("Optional. Comma-separated list of chain IDs (e.g., '1,56') or 'all' to fetch balances for specific chains."),
    metadata: z.string().optional().describe("Optional. Comma-separated list of metadata to include (e.g., 'url,logo')."),
    excludeSpamTokens: z.boolean().optional().describe("Optional. Set to true to exclude spam tokens."),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Maximum number of balance items to return for pagination.")),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination for balances."),
}, async ({ walletAddress, chainIds, metadata, excludeSpamTokens, limit, offset }) => {
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
    }
    catch (error) {
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
});
// Tool to get EVM account activity
server.tool("get_evm_activity", "Fetches EVM account activity for a given wallet address from the Dune API. Supports spam filtering and pagination.", {
    walletAddress: z.string().describe("The EVM wallet address (e.g., 0xd8da6bf26964af9d7eed9e03e53415d37aa96045)"),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Number of activity items to return. Defaults to 25 if not specified by API.")),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination, from a previous 'next_offset' response."),
    excludeSpamTokens: z.boolean().optional().describe("Optional. Set to true to exclude activities related to spam tokens."),
}, async ({ walletAddress, limit, offset, excludeSpamTokens }) => {
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
    }
    catch (error) {
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
});
// Tool to get EVM NFT collectibles
server.tool("get_evm_collectibles", "Fetches EVM NFT collectibles (ERC721 and ERC1155) for a given wallet address. Supports pagination.", {
    walletAddress: z.string().describe("The EVM wallet address (e.g., 0xd8da6bf26964af9d7eed9e03e53415d37aa96045)"),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Number of collectible items to return. Defaults to 50 if not specified by API.")),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination."),
}, async ({ walletAddress, limit, offset }) => {
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
    }
    catch (error) {
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
});
// Tool to get EVM transactions
server.tool("get_evm_transactions", "Retrieves granular EVM transaction details for a given wallet address from the Dune API.", {
    walletAddress: z.string().describe("The EVM wallet address (e.g., 0xd8da6bf26964af9d7eed9e03e53415d37aa96045)"),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Maximum number of transactions to return.")),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination, taken from 'next_offset' of a previous response."),
    // TODO: Add other potential filter parameters like start_block_time, end_block_time if supported by API and useful
}, async ({ walletAddress, limit, offset }) => {
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
    }
    catch (error) {
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
});
// Tool to get EVM token information
server.tool("get_evm_token_info", "Fetches detailed metadata and real-time price information for a native asset or ERC20 token on EVM chains from the Dune API.", {
    chainAndTokenUri: z.string().describe("The URI path segment for the token, e.g., '1/0xTOKEN_ADDRESS' for an ERC20 token on Ethereum (chain_id 1), or '1/native' for Ethereum's native token."),
    chainIds: z.string().describe("Mandatory. Comma-separated list of chain IDs (e.g., '1,56') or 'all' to fetch tokens for all supported chains."),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Maximum number of items to return.")),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination."),
}, async ({ chainAndTokenUri, chainIds, limit, offset }) => {
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
    }
    catch (error) {
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
});
// Tool to get EVM token holders
server.tool("get_evm_token_holders", "Discovers token distribution across ERC20 or ERC721 holders for a given token on a specific EVM chain, ranked by wallet value.", {
    chainId: z.union([z.string(), z.number()]).describe("The chain ID (e.g., 1 or '1' for Ethereum)."),
    tokenAddress: z.string().describe("The ERC20 or ERC721 token contract address (e.g., 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)."),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Maximum number of token holders to return.")),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination."),
}, async ({ chainId, tokenAddress, limit, offset }) => {
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
    }
    catch (error) {
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
});
// Tool to get SVM token balances
server.tool("get_svm_balances", "Fetches token balances (native, SPL, SPL-2022) for a given SVM wallet address from the Dune API.", {
    walletAddress: z.string().describe("The SVM wallet address (e.g., a Solana or Eclipse address)."),
    chains: z.string().optional().describe("Optional. Comma-separated list of chains (e.g., 'solana,eclipse') or 'all'. Defaults to fetching for all supported SVM chains if not specified."),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Maximum number of balance items to return.")),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination."),
}, async ({ walletAddress, chains, limit, offset }) => {
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
    }
    catch (error) {
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
});
// Tool to get SVM transactions
server.tool("get_svm_transactions", "Fetches transactions for a given SVM wallet address (currently Solana only) from the Dune API.", {
    walletAddress: z.string().describe("The SVM wallet address (e.g., a Solana address)."),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Maximum number of transactions to return.")),
    offset: z.string().optional().describe("Optional. The offset (cursor) for pagination."),
}, async ({ walletAddress, limit, offset }) => {
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
    }
    catch (error) {
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
});
// ============================================
// BLOCKSCOUT API TOOLS
// ============================================
// Tool to test Blockscout connectivity
server.tool("ping_blockscout", "Test connectivity to a Blockscout instance for a specific chain.", {
    chainId: z.string().describe("The chain ID to test (e.g., '1' for Ethereum, '137' for Polygon)"),
}, async ({ chainId }) => {
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool for Blockscout search
server.tool("blockscout_search", "Search across addresses, tokens, blocks, and transactions on a specific blockchain using Blockscout.", {
    query: z.string().describe("The search query (address, tx hash, block number, token name, etc.)"),
    chainId: z.string().describe("The chain ID to search on (e.g., '1' for Ethereum, '137' for Polygon)"),
}, async ({ query, chainId }) => {
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to get address information from Blockscout
server.tool("blockscout_address_info", "Get detailed information about an address including balance, type (EOA/contract), and basic stats from Blockscout.", {
    address: z.string().describe("The address to get information for"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
}, async ({ address, chainId }) => {
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to get address transactions from Blockscout
server.tool("blockscout_address_transactions", "Get all transactions for an address from Blockscout with filtering and pagination support.", {
    address: z.string().describe("The address to get transactions for"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    filter: z.string().optional().describe("Optional. Filter by transaction type: 'from' | 'to' | 'contract_creation'"),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Number of transactions to return (default: 50)")),
    next_page_params: z.string().optional().describe("Optional. Pagination cursor from previous response"),
}, async ({ address, chainId, filter, limit, next_page_params }) => {
    const path = `/addresses/${address}/transactions`;
    const queryParams = new URLSearchParams();
    if (filter)
        queryParams.append("filter", filter);
    if (limit)
        queryParams.append("items_count", String(limit));
    if (next_page_params)
        queryParams.append("next_page_params", next_page_params);
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to get address internal transactions from Blockscout
server.tool("blockscout_address_internal_txs", "Get internal transactions (contract interactions) for an address from Blockscout.", {
    address: z.string().describe("The address to get internal transactions for"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    filter: z.string().optional().describe("Optional. Filter by direction: 'from' | 'to'"),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Number of internal transactions to return (default: 50)")),
    next_page_params: z.string().optional().describe("Optional. Pagination cursor from previous response"),
}, async ({ address, chainId, filter, limit, next_page_params }) => {
    const path = `/addresses/${address}/internal-transactions`;
    const queryParams = new URLSearchParams();
    if (filter)
        queryParams.append("filter", filter);
    if (limit)
        queryParams.append("items_count", String(limit));
    if (next_page_params)
        queryParams.append("next_page_params", next_page_params);
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to get address logs from Blockscout
server.tool("blockscout_address_logs", "Get event logs emitted by or to an address from Blockscout.", {
    address: z.string().describe("The address to get logs for"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Number of logs to return (default: 50)")),
    next_page_params: z.string().optional().describe("Optional. Pagination cursor from previous response"),
}, async ({ address, chainId, limit, next_page_params }) => {
    const path = `/addresses/${address}/logs`;
    const queryParams = new URLSearchParams();
    if (limit)
        queryParams.append("items_count", String(limit));
    if (next_page_params)
        queryParams.append("next_page_params", next_page_params);
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to get address token balances from Blockscout
server.tool("blockscout_address_token_balances", "Get all token balances (ERC20, ERC721, ERC1155) for an address from Blockscout.", {
    address: z.string().describe("The address to get token balances for"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    type: z.string().optional().describe("Optional. Filter by token type: 'ERC-20' | 'ERC-721' | 'ERC-1155'"),
}, async ({ address, chainId, type }) => {
    const path = `/addresses/${address}/tokens`;
    const queryParams = new URLSearchParams();
    if (type)
        queryParams.append("type", type);
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// ============================================
// BLOCKSCOUT TRANSACTION TOOLS
// ============================================
// Tool to get transaction details from Blockscout
server.tool("blockscout_transaction_details", "Get comprehensive details about a specific transaction from Blockscout.", {
    txHash: z.string().describe("The transaction hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
}, async ({ txHash, chainId }) => {
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to get transaction logs from Blockscout
server.tool("blockscout_transaction_logs", "Get event logs emitted by a transaction from Blockscout.", {
    txHash: z.string().describe("The transaction hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
}, async ({ txHash, chainId }) => {
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to get transaction internal transactions from Blockscout
server.tool("blockscout_transaction_internal_txs", "Get internal transactions generated by a transaction from Blockscout.", {
    txHash: z.string().describe("The transaction hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
}, async ({ txHash, chainId }) => {
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to get transaction raw trace from Blockscout
server.tool("blockscout_transaction_raw_trace", "Get the raw execution trace of a transaction from Blockscout (useful for debugging).", {
    txHash: z.string().describe("The transaction hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
}, async ({ txHash, chainId }) => {
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to get transaction state changes from Blockscout
server.tool("blockscout_transaction_state_changes", "Get state changes (storage slot updates) caused by a transaction from Blockscout.", {
    txHash: z.string().describe("The transaction hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
}, async ({ txHash, chainId }) => {
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// ============================================
// BLOCKSCOUT BLOCK TOOLS
// ============================================
// Tool to get block details from Blockscout
server.tool("blockscout_block_details", "Get comprehensive information about a specific block from Blockscout.", {
    blockNumber: z.string().describe("The block number or hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
}, async ({ blockNumber, chainId }) => {
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to get block transactions from Blockscout
server.tool("blockscout_block_transactions", "Get all transactions included in a specific block from Blockscout.", {
    blockNumber: z.string().describe("The block number or hash"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Number of transactions to return (default: 50)")),
}, async ({ blockNumber, chainId, limit }) => {
    const path = `/blocks/${blockNumber}/transactions`;
    const queryParams = new URLSearchParams();
    if (limit)
        queryParams.append("items_count", String(limit));
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to get latest blocks from Blockscout
server.tool("blockscout_latest_blocks", "Get the most recent blocks from the blockchain via Blockscout.", {
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Number of blocks to return (default: 50)")),
}, async ({ chainId, limit }) => {
    const path = "/blocks";
    const queryParams = new URLSearchParams();
    if (limit)
        queryParams.append("items_count", String(limit));
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// ============================================
// BLOCKSCOUT SMART CONTRACT TOOLS
// ============================================
// Tool to get smart contract information from Blockscout
server.tool("blockscout_contract_info", "Get verified smart contract details including source code, ABI, and metadata from Blockscout.", {
    address: z.string().describe("The contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
}, async ({ address, chainId }) => {
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to get smart contract methods from Blockscout
server.tool("blockscout_contract_methods", "Get readable and writable methods of a verified smart contract from Blockscout.", {
    address: z.string().describe("The contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
}, async ({ address, chainId }) => {
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to read smart contract state from Blockscout
server.tool("blockscout_read_contract", "Call a read method on a verified smart contract and get the result from Blockscout.", {
    address: z.string().describe("The contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    method: z.string().describe("The method name to call"),
    args: z.array(z.any()).optional().describe("Optional. Array of arguments to pass to the method"),
}, async ({ address, chainId, method, args }) => {
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to list verified smart contracts from Blockscout
server.tool("blockscout_verified_contracts", "Get a list of recently verified smart contracts from Blockscout.", {
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    filter: z.string().optional().describe("Optional. Filter by verification type: 'solidity' | 'vyper' | 'yul'"),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Number of contracts to return (default: 50)")),
}, async ({ chainId, filter, limit }) => {
    const path = "/smart-contracts";
    const queryParams = new URLSearchParams();
    if (filter)
        queryParams.append("filter", filter);
    if (limit)
        queryParams.append("items_count", String(limit));
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// ============================================
// BLOCKSCOUT TOKEN & NFT TOOLS
// ============================================
// Tool to get token information from Blockscout
server.tool("blockscout_token_info", "Get detailed information about a token including supply, decimals, and metadata from Blockscout.", {
    address: z.string().describe("The token contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
}, async ({ address, chainId }) => {
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to get token transfers from Blockscout
server.tool("blockscout_token_transfers", "Get token transfer history for a specific token from Blockscout.", {
    address: z.string().describe("The token contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Number of transfers to return (default: 50)")),
    next_page_params: z.string().optional().describe("Optional. Pagination cursor from previous response"),
}, async ({ address, chainId, limit, next_page_params }) => {
    const path = `/tokens/${address}/transfers`;
    const queryParams = new URLSearchParams();
    if (limit)
        queryParams.append("items_count", String(limit));
    if (next_page_params)
        queryParams.append("next_page_params", next_page_params);
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to get token holders from Blockscout
server.tool("blockscout_token_holders", "Get list of token holders for an ERC20 or ERC721 token from Blockscout.", {
    address: z.string().describe("The token contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Number of holders to return (default: 50)")),
    next_page_params: z.string().optional().describe("Optional. Pagination cursor from previous response"),
}, async ({ address, chainId, limit, next_page_params }) => {
    const path = `/tokens/${address}/holders`;
    const queryParams = new URLSearchParams();
    if (limit)
        queryParams.append("items_count", String(limit));
    if (next_page_params)
        queryParams.append("next_page_params", next_page_params);
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to get NFT instances from Blockscout
server.tool("blockscout_nft_instances", "Get individual NFT instances for an NFT collection from Blockscout.", {
    address: z.string().describe("The NFT collection contract address"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
    limit: z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), z.number().int().positive().optional().describe("Optional. Number of NFT instances to return (default: 50)")),
    next_page_params: z.string().optional().describe("Optional. Pagination cursor from previous response"),
}, async ({ address, chainId, limit, next_page_params }) => {
    const path = `/tokens/${address}/instances`;
    const queryParams = new URLSearchParams();
    if (limit)
        queryParams.append("items_count", String(limit));
    if (next_page_params)
        queryParams.append("next_page_params", next_page_params);
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Tool to get specific NFT metadata from Blockscout
server.tool("blockscout_nft_metadata", "Get metadata for a specific NFT token ID from Blockscout.", {
    address: z.string().describe("The NFT collection contract address"),
    tokenId: z.string().describe("The specific NFT token ID"),
    chainId: z.string().describe("The chain ID (e.g., '1' for Ethereum, '137' for Polygon)"),
}, async ({ address, tokenId, chainId }) => {
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
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error.message }],
        };
    }
});
// Resource for EVM Supported Chains
server.resource("dune_evm_supported_chains", // Internal registration name
"dune://evm/supported-chains", // The URI clients will use to request this resource
{
    name: "Dune EVM Supported Chains",
    description: "Provides a list of EVM chains supported by the Dune API and their capabilities per endpoint.",
    mimeType: "application/json"
}, async (uri) => {
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
    }
    catch (error) {
        return {
            contents: [{
                    uri: uri.href,
                    mimeType: "text/plain",
                    text: error.message, // Error message from callDuneApi is already detailed
                }],
        };
    }
});
// MCP Prompts
server.prompt("evm_wallet_overview", {
    walletAddress: z.string().describe("The EVM wallet address to get an overview for.")
}, ({ walletAddress }) => {
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
});
server.prompt("analyze_erc20_token", "Analyze a specific ERC20 token, showing its information and top 10 holders.", // Description string
{
    chainId: z.string().describe("The chain ID where the token resides (e.g., '1' for Ethereum). Input as a string."),
    tokenAddress: z.string().describe("The ERC20 token contract address.")
}, ({ chainId, tokenAddress }) => {
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
});
server.prompt("svm_address_check", "Check basic information for an SVM address, including balances and its 3 most recent transactions.", {
    walletAddress: z.string().describe("The SVM wallet address to check.")
}, ({ walletAddress }) => {
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
});
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
