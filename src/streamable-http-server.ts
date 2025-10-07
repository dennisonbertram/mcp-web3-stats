/**
 * Modern Streamable HTTP Server Transport implementation
 * Implements the MCP 2025-03-26 specification for HTTP transport
 */

import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { VERSION } from './utils/constants.js';
import { validateAuth, sendAuthRequired, getAuthConfigFromEnv, type AuthConfig } from './auth-middleware.js';

/**
 * Starts a modern Streamable HTTP server for MCP
 * @param server The MCP server instance
 * @param port The port to listen on
 * @param authConfig Optional authentication configuration
 * @returns The HTTP server instance
 */
export async function startStreamableHttpServer(
  server: McpServer,
  port: number,
  authConfig?: AuthConfig
): Promise<Server> {
  // Use provided auth config or get from environment
  const auth = authConfig || getAuthConfigFromEnv();
  // Map to store transport instances by session ID
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // Create HTTP server
  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);

    // Health check endpoint - MUST be first, before any auth checks
    if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        version: VERSION,
        uptime: process.uptime()
      }));
      return;
    }

    // Validate authentication for all other endpoints
    if (!validateAuth(req, auth)) {
      sendAuthRequired(res);
      return;
    }

    // Main MCP endpoint
    if (url.pathname === '/mcp') {
      // Get or extract session ID from headers
      const sessionId = req.headers['mcp-session-id'] as string;

      // Handle different HTTP methods
      if (req.method === 'POST') {
        // Collect request body
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
          let parsedBody;
          try {
            parsedBody = JSON.parse(body);
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32700, message: 'Parse error' },
              id: null
            }));
            return;
          }

          // Check if this is an initialization request
          const isInitialization = parsedBody.method === 'initialize';

          let transport: StreamableHTTPServerTransport;

          if (isInitialization) {
            // Create new transport for initialization
            transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID(),
              onsessioninitialized: async (sid) => {
                console.log(`Session initialized: ${sid}`);
                // Store transport when session is initialized
                transports.set(sid, transport);
              },
              onsessionclosed: async (sid) => {
                console.log(`Session closed: ${sid}`);
                transports.delete(sid);
              },
              enableJsonResponse: true,
              // Disable DNS rebinding protection in the transport as we handle it at the HTTP level
              enableDnsRebindingProtection: false
            });

            // Connect the transport to the MCP server
            // Note: connect() internally calls start() on the transport
            await server.connect(transport);
          } else if (sessionId && transports.has(sessionId)) {
            // Use existing transport for non-initialization requests
            transport = transports.get(sessionId)!;
          } else {
            // No session ID for non-initialization request
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32600, message: 'Invalid Request: Missing or invalid session ID' },
              id: null
            }));
            return;
          }

          // Handle the request through the transport
          await transport.handleRequest(req, res, parsedBody);
        });
      } else if (req.method === 'GET') {
        // SSE stream endpoint - requires session ID
        if (!sessionId || !transports.has(sessionId)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Missing or invalid session ID'
          }));
          return;
        }

        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res);
      } else if (req.method === 'DELETE') {
        // Session termination
        if (!sessionId || !transports.has(sessionId)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Session not found'
          }));
          return;
        }

        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res);

        // Remove transport from map after handling DELETE
        transports.delete(sessionId);
      } else if (req.method === 'OPTIONS') {
        // CORS preflight
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Mcp-Session-Id, MCP-Protocol-Version',
          'Access-Control-Max-Age': '86400'
        });
        res.end();
      } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Method not allowed'
        }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Not found'
      }));
    }
  });

  // Start listening on specified host
  // Default to :: (IPv6 wildcard) for Railway/cloud deployments
  // :: accepts both IPv4 and IPv6 connections (required by Railway)
  // Override with MCP_BIND_HOST=127.0.0.1 for local testing if needed
  const host = process.env.MCP_BIND_HOST || '::';
  return new Promise<Server>((resolve, reject) => {
    httpServer.listen(port, host, () => {
      console.log(`MCP Web3 Stats v${VERSION} started with modern Streamable HTTP transport`);
      console.log(`Server running at http://${host}:${port}/`);
      console.log('');
      console.log('Endpoints:');
      console.log(`  MCP:     http://${host}:${port}/mcp`);
      console.log(`  Health:  http://${host}:${port}/health`);
      if (auth.enabled) {
        console.log('');
        console.log('🔒 Authentication: ENABLED');
        console.log(`   Methods: ${auth.apiKeys ? 'Bearer Token, X-API-Key' : ''}${auth.basicAuthCredentials ? ', Basic Auth' : ''}`);
      } else {
        console.log('');
        console.log('⚠️  Authentication: DISABLED (development mode)');
      }
      console.log('');
      console.log('Test with cURL:');
      console.log('');
      console.log('1. Initialize session:');
      console.log(`   curl -X POST http://127.0.0.1:${port}/mcp \\`);
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -H "MCP-Protocol-Version: 2025-03-26" \\');
      console.log('     -d \'{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}},"id":1}\'');
      console.log('');
      console.log('2. Copy Mcp-Session-Id from response headers');
      console.log('');
      console.log('3. List tools (replace YOUR_SESSION_ID):');
      console.log(`   curl -X POST http://127.0.0.1:${port}/mcp \\`);
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -H "Mcp-Session-Id: YOUR_SESSION_ID" \\');
      console.log('     -H "MCP-Protocol-Version: 2025-03-26" \\');
      console.log('     -d \'{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}\'');
      console.log('');
      resolve(httpServer);
    });

    httpServer.on('error', reject);
  });
}