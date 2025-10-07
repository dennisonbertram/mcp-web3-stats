/**
 * Tests for StreamableHTTPServerTransport implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createServer, Server } from 'node:http';
import { startStreamableHttpServer } from '../src/streamable-http-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

describe('StreamableHTTPServerTransport', () => {
  let httpServer: Server;
  let mcpServer: McpServer;
  const TEST_PORT = 3456;

  beforeEach(() => {
    // Create a new MCP server for each test
    mcpServer = new McpServer({
      name: 'TestServer',
      version: '1.0.0',
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    });
  });

  afterEach(async () => {
    // Clean up servers after each test
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    }
  });

  describe('startStreamableHttpServer', () => {
    it('should start an HTTP server on the specified port', async () => {
      httpServer = await startStreamableHttpServer(mcpServer, TEST_PORT);

      expect(httpServer).toBeDefined();
      expect(httpServer.listening).toBe(true);

      // Get the actual port the server is listening on
      const address = httpServer.address();
      expect(address).toBeDefined();
      if (typeof address === 'object' && address !== null) {
        expect(address.port).toBe(TEST_PORT);
      }
    });

    it('should bind to localhost only for security', async () => {
      httpServer = await startStreamableHttpServer(mcpServer, TEST_PORT);

      const address = httpServer.address();
      if (typeof address === 'object' && address !== null) {
        expect(address.address).toBe('127.0.0.1');
      }
    });

    it('should handle GET /health endpoint', async () => {
      httpServer = await startStreamableHttpServer(mcpServer, TEST_PORT);

      const response = await fetch(`http://127.0.0.1:${TEST_PORT}/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('sessions');
    });

    it('should handle POST /mcp for initialization', async () => {
      httpServer = await startStreamableHttpServer(mcpServer, TEST_PORT);

      const response = await fetch(`http://127.0.0.1:${TEST_PORT}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'MCP-Protocol-Version': '2025-03-26'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          },
          id: 1
        })
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Mcp-Session-Id')).toBeTruthy();

      const data = await response.json();
      expect(data).toHaveProperty('jsonrpc', '2.0');
      expect(data).toHaveProperty('id', 1);
      expect(data).toHaveProperty('result');
    });

    it('should handle requests with missing Accept header', async () => {
      httpServer = await startStreamableHttpServer(mcpServer, TEST_PORT);

      const response = await fetch(`http://127.0.0.1:${TEST_PORT}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'MCP-Protocol-Version': '2025-03-26'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          },
          id: 1
        })
      });

      // Should reject with 406 Not Acceptable
      expect(response.status).toBe(406);
    });

    it('should handle DELETE /mcp for session termination', async () => {
      httpServer = await startStreamableHttpServer(mcpServer, TEST_PORT);

      // First initialize a session
      const initResponse = await fetch(`http://127.0.0.1:${TEST_PORT}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'MCP-Protocol-Version': '2025-03-26'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          },
          id: 1
        })
      });

      const sessionId = initResponse.headers.get('Mcp-Session-Id');
      expect(sessionId).toBeTruthy();

      // Now delete the session
      const deleteResponse = await fetch(`http://127.0.0.1:${TEST_PORT}/mcp`, {
        method: 'DELETE',
        headers: {
          'Mcp-Session-Id': sessionId!,
          'MCP-Protocol-Version': '2025-03-26'
        }
      });

      expect(deleteResponse.status).toBe(200);
    });

    it('should return 404 for unknown endpoints', async () => {
      httpServer = await startStreamableHttpServer(mcpServer, TEST_PORT);

      const response = await fetch(`http://127.0.0.1:${TEST_PORT}/unknown`, {
        method: 'GET'
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Not found');
    });
  });
});