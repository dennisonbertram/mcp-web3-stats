/**
 * Tests for Hybrid HTTP Server supporting both modern and legacy transports
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Server } from 'node:http';
import { startHybridHttpServer } from '../src/hybrid-http-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

describe('HybridHTTPServer', () => {
  let httpServer: Server;
  let mcpServer: McpServer;
  const TEST_PORT = 3457;

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

  describe('startHybridHttpServer', () => {
    it('should start an HTTP server supporting both modern and legacy endpoints', async () => {
      httpServer = await startHybridHttpServer(mcpServer, TEST_PORT);

      expect(httpServer).toBeDefined();
      expect(httpServer.listening).toBe(true);
    });

    it('should handle modern /mcp endpoint', async () => {
      httpServer = await startHybridHttpServer(mcpServer, TEST_PORT);

      // Initialize via modern endpoint
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
            clientInfo: { name: 'modern-client', version: '1.0.0' }
          },
          id: 1
        })
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Mcp-Session-Id')).toBeTruthy();
    });

    it.skip('should handle legacy /sse endpoint', async () => {
      httpServer = await startHybridHttpServer(mcpServer, TEST_PORT);

      // Connect via legacy SSE endpoint with AbortController for cleanup
      const abortController = new AbortController();
      const response = await fetch(`http://127.0.0.1:${TEST_PORT}/sse`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream'
        },
        signal: abortController.signal
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Session-Id')).toBeTruthy();
      expect(response.headers.get('Content-Type')).toContain('text/event-stream');

      // Immediately abort to clean up the connection
      abortController.abort();
    });

    it.skip('should handle legacy /message endpoint', async () => {
      httpServer = await startHybridHttpServer(mcpServer, TEST_PORT);

      // First establish SSE connection to get session ID with AbortController
      const abortController = new AbortController();
      const sseResponse = await fetch(`http://127.0.0.1:${TEST_PORT}/sse`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream'
        },
        signal: abortController.signal
      });

      const sessionId = sseResponse.headers.get('X-Session-Id');
      expect(sessionId).toBeTruthy();

      // Now send message via legacy endpoint
      const messageResponse = await fetch(`http://127.0.0.1:${TEST_PORT}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId!
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'legacy-client', version: '1.0.0' }
          },
          id: 1
        })
      });

      expect(messageResponse.status).toBe(200);
      const data = await messageResponse.json();
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('sessionId', sessionId);

      // Clean up SSE connection
      abortController.abort();
    });

    it('should handle /health endpoint', async () => {
      httpServer = await startHybridHttpServer(mcpServer, TEST_PORT);

      const response = await fetch(`http://127.0.0.1:${TEST_PORT}/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('modernSessions');
      expect(data).toHaveProperty('legacySessions');
    });

    it.skip('should isolate modern and legacy sessions', async () => {
      httpServer = await startHybridHttpServer(mcpServer, TEST_PORT);

      // Create modern session
      const modernResponse = await fetch(`http://127.0.0.1:${TEST_PORT}/mcp`, {
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
            clientInfo: { name: 'modern-client', version: '1.0.0' }
          },
          id: 1
        })
      });

      const modernSessionId = modernResponse.headers.get('Mcp-Session-Id');
      expect(modernSessionId).toBeTruthy();

      // Create legacy session with AbortController
      const abortController = new AbortController();
      const legacyResponse = await fetch(`http://127.0.0.1:${TEST_PORT}/sse`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream'
        },
        signal: abortController.signal
      });

      const legacySessionId = legacyResponse.headers.get('X-Session-Id');
      expect(legacySessionId).toBeTruthy();

      // Sessions should be different
      expect(modernSessionId).not.toBe(legacySessionId);

      // Check health endpoint shows both sessions
      const healthResponse = await fetch(`http://127.0.0.1:${TEST_PORT}/health`);
      const healthData = await healthResponse.json();

      expect(healthData.modernSessions).toBeGreaterThan(0);
      expect(healthData.legacySessions).toBeGreaterThan(0);

      // Clean up legacy SSE connection
      abortController.abort();
    });
  });
});