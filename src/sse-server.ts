#!/usr/bin/env node

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { VERSION } from "./utils/constants.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";
import { registerAllPrompts } from "./prompts/index.js";

export async function startSSEServer(server: McpServer, port: number) {
  const transports = new Map<string, SSEServerTransport>();
  
  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id');
    res.setHeader('Access-Control-Expose-Headers', 'X-Session-Id');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    const url = new URL(req.url || '/', `http://localhost:${port}`);
    
    // SSE endpoint for establishing connection
    if (url.pathname === '/sse' && req.method === 'GET') {
      console.log('New SSE connection request');
      const transport = new SSEServerTransport('/message', res);
      
      // Store transport by session ID before starting
      const sessionId = transport.sessionId;
      transports.set(sessionId, transport);
      
      // Connect to MCP server (this automatically calls start())
      await server.connect(transport);
      
      // Clean up on close
      transport.onclose = () => {
        transports.delete(sessionId);
        console.log(`SSE connection closed: ${sessionId}`);
      };
      
      console.log(`SSE connection established: ${sessionId}`);
    }
    // Message endpoint for receiving JSON-RPC messages
    else if (url.pathname === '/message' && req.method === 'POST') {
      const sessionId = req.headers['x-session-id'] as string;
      
      if (!sessionId || !transports.has(sessionId)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid or missing session ID' }));
        return;
      }
      
      const transport = transports.get(sessionId)!;
      
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', async () => {
        try {
          const message = JSON.parse(body);
          await transport.handleMessage(message);
          
          // For now, just acknowledge receipt
          // The actual response will come through SSE
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', sessionId }));
        } catch (error) {
          console.error('Error handling message:', error);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid message' }));
        }
      });
    }
    // Health check endpoint
    else if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        version: VERSION,
        sessions: transports.size 
      }));
    }
    else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  });
  
  return new Promise<void>((resolve) => {
    httpServer.listen(port, () => {
      console.log(`MCP Web3 Stats v${VERSION} started in SSE mode`);
      console.log(`Server running at http://localhost:${port}/`);
      console.log('');
      console.log('Endpoints:');
      console.log(`  SSE:     http://localhost:${port}/sse`);
      console.log(`  Message: http://localhost:${port}/message`);
      console.log(`  Health:  http://localhost:${port}/health`);
      console.log('');
      console.log('Test with cURL:');
      console.log('');
      console.log('1. First, establish SSE connection and get session ID:');
      console.log(`   curl -N -i http://localhost:${port}/sse`);
      console.log('');
      console.log('2. Copy the X-Session-Id from response headers');
      console.log('');
      console.log('3. Send a request (replace YOUR_SESSION_ID):');
      console.log(`   curl -X POST http://localhost:${port}/message \\`);
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -H "X-Session-Id: YOUR_SESSION_ID" \\');
      console.log('     -d \'{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}\'');
      console.log('');
      console.log('The response will come through the SSE connection.');
      resolve();
    });
  });
}