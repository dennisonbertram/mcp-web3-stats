# Building an MCP Server: The Web3 Stats Project

This document outlines the architecture, design decisions, and implementation steps that went into building the MCP Web3 Stats server. It serves as a practical guide for creating reliable Model Context Protocol (MCP) servers.

## What is an MCP Server?

The Model Context Protocol (MCP) enables Language Models (LLMs) to interact with external services through tools and resources. An MCP server acts as a bridge between LLMs and specialized APIs, allowing AI assistants to access external data without direct API integration.

## Project Overview

The MCP Web3 Stats server provides blockchain data analysis capabilities by wrapping the Dune API. It allows LLMs to:
- Query wallet balances across EVM and SVM chains
- Analyze token information
- View transaction histories
- Examine NFT collections
- Discover token holder distributions

## Architecture Design

### Core Components

1. **MCP Server Instance**: The central component that registers tools, resources, and prompts.
2. **API Client**: A wrapper around the Dune API with proper error handling.
3. **Tool Implementations**: Functions that process specific data requests.
4. **Schema Definitions**: Input validation using Zod.
5. **Transport Layer**: Using stdio for communication.

### Design Decisions

#### 1. API Client Design

We implemented a centralized API client function (`callDuneApi`) that:
- Handles different base URLs based on API version
- Manages authentication headers
- Provides consistent error handling
- Logs API calls for debugging

```typescript
async function callDuneApi(path: string, queryParams?: URLSearchParams) {
  const baseUrl = path.startsWith("/beta") ? "https://api.sim.dune.com/beta" : "https://api.sim.dune.com/v1";
  const fullPath = path.startsWith("/beta") ? path.substring("/beta".length) : path.substring("/v1".length);
  
  let url = `${baseUrl}${fullPath}`;

  if (queryParams && queryParams.toString()) {
    url += `?${queryParams.toString()}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      "X-Sim-Api-Key": DUNE_API_KEY!,
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Dune API Error: ${response.status} ${response.statusText}. Details: ${errorBody}`);
  }
  return response.json();
}
```

#### 2. Robust Input Validation

We use Zod schemas for each tool to:
- Validate input types
- Convert string numbers to actual numbers
- Provide clear parameter descriptions
- Make complex parameters optional with sensible defaults

```typescript
{
  walletAddress: z.string().describe("The EVM wallet address (e.g., 0xd8da6bf26964af9d7eed9e03e53415d37aa96045)"),
  limit: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().positive().optional().describe("Optional. Maximum number of balance items to return for pagination.")
  ),
  // Other parameters...
}
```

#### 3. Consistent Response Format

All tools follow a consistent response format:
- Success responses include JSON data
- Error responses use the isError flag with descriptive messages
- Content is always returned as an array of content items

```typescript
// Success case
return {
  content: [
    {
      type: "text",
      text: JSON.stringify(data, null, 2),
    },
  ],
};

// Error case
return {
  isError: true,
  content: [
    {
      type: "text",
      text: error.message,
    },
  ],
};
```

#### 4. CLI Support

The server can be used both as an MCP server and as a CLI tool:
- Includes argument parsing for help and version
- Provides clear error messages for missing API keys
- Uses a shebang line for direct execution

#### 5. Resource and Prompt Design

In addition to tools, we provide:
- Resources for reference data (like supported chains)
- Premade prompts that guide LLMs on common use cases

## Implementation Steps

### 1. Project Setup

1. Initialize a TypeScript project with appropriate configuration
2. Add dependencies on the MCP SDK and necessary utilities
3. Configure dotenv for environment variable management
4. Set up a proper package.json with metadata for npm publishing

### 2. Core Server Implementation

1. Create the main MCP server instance with basic information
2. Implement the API client function for Dune
3. Add environment variable validation
4. Set up the transport layer (stdio)

### 3. Tool Implementation Strategy

For each tool, we followed a consistent pattern:
1. Define the tool with a unique name and descriptive documentation
2. Create a Zod schema for input validation
3. Implement the handler function with:
   - Parameter extraction
   - API path construction
   - Query parameter assembly
   - Error handling
   - Response formatting

### 4. Testing and Verification

For each tool:
1. Test with valid inputs
2. Verify error handling with invalid inputs
3. Check pagination functionality
4. Validate response format consistency

### 5. Packaging for Distribution

1. Configure proper build settings in tsconfig.json
2. Add CLI support with help and version flags
3. Ensure the built files are included in the repository
4. Set up npm packaging with correct metadata
5. Make the entry point executable

## Common Issues and Solutions

### 1. API Authentication

**Problem**: Missing or invalid API keys cause runtime failures.
**Solution**: Early validation of environment variables with clear error messages.

```typescript
if (!DUNE_API_KEY) {
  console.error("FATAL ERROR: DUNE_API_KEY is not set in the environment variables.");
  process.exit(1);
}
```

### 2. Type Conversion

**Problem**: Parameters from LLMs come as strings, even for numeric values.
**Solution**: Use Zod's preprocessing to convert types appropriately.

```typescript
limit: z.preprocess(
  (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
  z.number().int().positive().optional()
)
```

### 3. Error Handling

**Problem**: API errors need to be properly propagated to the LLM.
**Solution**: Consistent try/catch blocks with formatted error responses.

```typescript
try {
  const data = await callDuneApi(path, queryParams);
  // Success response
} catch (error: any) {
  return {
    isError: true,
    content: [{ type: "text", text: error.message }],
  };
}
```

### 4. Documentation

**Problem**: LLMs need clear parameter descriptions to use tools correctly.
**Solution**: Thorough descriptions in Zod schemas and clear tool documentation.

## Best Practices

1. **Single Responsibility**: Each tool does one thing well
2. **Consistent Patterns**: Follow the same structure for all tools
3. **Explicit Typing**: Use TypeScript and Zod for type safety
4. **Error Transparency**: Provide detailed error messages
5. **Graceful Degradation**: Handle API failures gracefully

## Conclusion

Building a reliable MCP server requires careful attention to:
- Input validation
- Error handling
- Response formatting
- Documentation

By following the patterns in this project, you can create robust MCP servers that provide LLMs with reliable access to external APIs. 