/**
 * Modern Streamable HTTP Server Transport implementation
 * Implements the MCP 2025-03-26 specification for HTTP transport
 */
import { Server } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type AuthConfig } from './auth-middleware.js';
/**
 * Starts a modern Streamable HTTP server for MCP
 * @param server The MCP server instance
 * @param port The port to listen on
 * @param authConfig Optional authentication configuration
 * @returns The HTTP server instance
 */
export declare function startStreamableHttpServer(server: McpServer, port: number, authConfig?: AuthConfig): Promise<Server>;
