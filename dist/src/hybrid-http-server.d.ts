/**
 * Hybrid HTTP Server supporting both modern Streamable HTTP and legacy SSE transports
 * Provides backwards compatibility while supporting the latest MCP specification
 */
import { Server } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
/**
 * Starts a hybrid HTTP server supporting both modern and legacy MCP transports
 * @param server The MCP server instance
 * @param port The port to listen on
 * @returns The HTTP server instance
 */
export declare function startHybridHttpServer(server: McpServer, port: number): Promise<Server>;
