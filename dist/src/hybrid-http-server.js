/**
 * Hybrid HTTP Server supporting both modern Streamable HTTP and legacy SSE transports
 * Provides backwards compatibility while supporting the latest MCP specification
 */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { VERSION } from './utils/constants.js';
/**
 * Starts a hybrid HTTP server supporting both modern and legacy MCP transports
 * @param server The MCP server instance
 * @param port The port to listen on
 * @returns The HTTP server instance
 */
export async function startHybridHttpServer(server, port) {
    // Maps for modern Streamable HTTP sessions
    const modernTransports = new Map();
    // Maps for legacy SSE sessions
    const legacyTransports = new Map();
    // Create HTTP server
    const httpServer = createServer(async (req, res) => {
        const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
        // Enable CORS for all endpoints
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id, Mcp-Session-Id, MCP-Protocol-Version');
        res.setHeader('Access-Control-Expose-Headers', 'X-Session-Id, Mcp-Session-Id');
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        // Health check endpoint
        if (url.pathname === '/health' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                version: VERSION,
                modernSessions: modernTransports.size,
                legacySessions: legacyTransports.size,
                totalSessions: modernTransports.size + legacyTransports.size
            }));
            return;
        }
        // ========== MODERN STREAMABLE HTTP ENDPOINTS ==========
        // Modern MCP endpoint (2025-03-26 specification)
        if (url.pathname === '/mcp') {
            const sessionId = req.headers['mcp-session-id'];
            if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk.toString());
                req.on('end', async () => {
                    let parsedBody;
                    try {
                        parsedBody = JSON.parse(body);
                    }
                    catch (error) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            jsonrpc: '2.0',
                            error: { code: -32700, message: 'Parse error' },
                            id: null
                        }));
                        return;
                    }
                    const isInitialization = parsedBody.method === 'initialize';
                    let transport;
                    if (isInitialization) {
                        // Create new modern transport
                        transport = new StreamableHTTPServerTransport({
                            sessionIdGenerator: () => randomUUID(),
                            onsessioninitialized: async (sid) => {
                                console.log(`[Modern] Session initialized: ${sid}`);
                                modernTransports.set(sid, transport);
                            },
                            onsessionclosed: async (sid) => {
                                console.log(`[Modern] Session closed: ${sid}`);
                                modernTransports.delete(sid);
                            },
                            enableJsonResponse: true,
                            enableDnsRebindingProtection: false
                        });
                        // Connect to MCP server
                        await server.connect(transport);
                    }
                    else if (sessionId && modernTransports.has(sessionId)) {
                        transport = modernTransports.get(sessionId);
                    }
                    else {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            jsonrpc: '2.0',
                            error: { code: -32600, message: 'Invalid Request: Missing or invalid session ID' },
                            id: null
                        }));
                        return;
                    }
                    await transport.handleRequest(req, res, parsedBody);
                });
            }
            else if (req.method === 'GET') {
                // SSE stream for modern transport
                if (!sessionId || !modernTransports.has(sessionId)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'Missing or invalid session ID'
                    }));
                    return;
                }
                const transport = modernTransports.get(sessionId);
                await transport.handleRequest(req, res);
            }
            else if (req.method === 'DELETE') {
                // Session termination for modern transport
                if (!sessionId || !modernTransports.has(sessionId)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'Session not found'
                    }));
                    return;
                }
                const transport = modernTransports.get(sessionId);
                await transport.handleRequest(req, res);
                modernTransports.delete(sessionId);
            }
            else {
                res.writeHead(405, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'Method not allowed'
                }));
            }
            return;
        }
        // ========== LEGACY SSE ENDPOINTS (2024-11-05 specification) ==========
        // Legacy SSE endpoint for establishing connection
        if (url.pathname === '/sse' && req.method === 'GET') {
            console.log('[Legacy] New SSE connection request');
            const transport = new SSEServerTransport('/message', res);
            const sessionId = transport.sessionId;
            legacyTransports.set(sessionId, transport);
            // Connect to MCP server
            await server.connect(transport);
            // Clean up on close
            transport.onclose = () => {
                legacyTransports.delete(sessionId);
                console.log(`[Legacy] SSE connection closed: ${sessionId}`);
            };
            console.log(`[Legacy] SSE connection established: ${sessionId}`);
            return;
        }
        // Legacy message endpoint for receiving JSON-RPC messages
        if (url.pathname === '/message' && req.method === 'POST') {
            const sessionId = req.headers['x-session-id'];
            if (!sessionId || !legacyTransports.has(sessionId)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid or missing session ID' }));
                return;
            }
            const transport = legacyTransports.get(sessionId);
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const message = JSON.parse(body);
                    await transport.handleMessage(message);
                    // Acknowledge receipt
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok', sessionId }));
                }
                catch (error) {
                    console.error('[Legacy] Error handling message:', error);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid message' }));
                }
            });
            return;
        }
        // Unknown endpoint
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    });
    // Start listening on specified host
    // Default to :: (IPv6 wildcard) for Railway/cloud deployments
    // :: accepts both IPv4 and IPv6 connections (required by Railway)
    // Override with MCP_BIND_HOST=127.0.0.1 for local testing if needed
    const host = process.env.MCP_BIND_HOST || '::';
    return new Promise((resolve, reject) => {
        httpServer.listen(port, host, () => {
            console.log(`MCP Web3 Stats v${VERSION} started with hybrid HTTP/SSE transport`);
            console.log(`Server running at http://${host}:${port}/`);
            console.log('');
            console.log('========== MODERN ENDPOINTS (2025-03-26) ==========');
            console.log(`  MCP:     http://127.0.0.1:${port}/mcp`);
            console.log('');
            console.log('========== LEGACY ENDPOINTS (2024-11-05) ==========');
            console.log(`  SSE:     http://127.0.0.1:${port}/sse`);
            console.log(`  Message: http://127.0.0.1:${port}/message`);
            console.log('');
            console.log('========== COMMON ENDPOINTS ==========');
            console.log(`  Health:  http://127.0.0.1:${port}/health`);
            console.log('');
            console.log('Test Modern Transport:');
            console.log(`  curl -X POST http://127.0.0.1:${port}/mcp \\`);
            console.log('    -H "Content-Type: application/json" \\');
            console.log('    -H "Accept: application/json, text/event-stream" \\');
            console.log('    -H "MCP-Protocol-Version: 2025-03-26" \\');
            console.log('    -d \'{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}\'');
            console.log('');
            console.log('Test Legacy Transport:');
            console.log(`  curl -N -i http://127.0.0.1:${port}/sse`);
            console.log('');
            resolve(httpServer);
        });
        httpServer.on('error', reject);
    });
}
