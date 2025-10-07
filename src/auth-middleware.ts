#!/usr/bin/env node

import { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Authentication middleware for MCP HTTP transport
 *
 * Supports multiple authentication methods:
 * 1. API Key via Authorization: Bearer token
 * 2. API Key via X-API-Key header
 * 3. Basic Authentication
 */

export interface AuthConfig {
  /**
   * Enable authentication (default: false for local dev)
   */
  enabled: boolean;

  /**
   * Valid API keys for Bearer token authentication
   */
  apiKeys?: string[];

  /**
   * Basic auth credentials (username:password pairs)
   */
  basicAuthCredentials?: { username: string; password: string }[];

  /**
   * Custom authentication function
   */
  customAuth?: (req: IncomingMessage) => boolean;
}

/**
 * Validates authentication based on configuration
 */
export function validateAuth(req: IncomingMessage, config: AuthConfig): boolean {
  // If auth is disabled, allow all requests (local development)
  if (!config.enabled) {
    return true;
  }

  // Health checks always allowed (for Railway/monitoring)
  const url = new URL(req.url || '/', `http://localhost`);
  if (url.pathname === '/health') {
    return true;
  }

  // Check custom authentication function first
  if (config.customAuth) {
    return config.customAuth(req);
  }

  // Check Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (config.apiKeys && config.apiKeys.includes(token)) {
      return true;
    }
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'] as string;
  if (apiKeyHeader && config.apiKeys && config.apiKeys.includes(apiKeyHeader)) {
    return true;
  }

  // Check Basic Authentication
  if (authHeader?.startsWith('Basic ')) {
    const base64Credentials = authHeader.substring(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    if (config.basicAuthCredentials) {
      const validCred = config.basicAuthCredentials.find(
        cred => cred.username === username && cred.password === password
      );
      if (validCred) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Sends an authentication required response
 */
export function sendAuthRequired(res: ServerResponse, method: 'Bearer' | 'Basic' = 'Bearer'): void {
  res.writeHead(401, {
    'Content-Type': 'application/json',
    'WWW-Authenticate': method === 'Basic' ? 'Basic realm="MCP Server"' : 'Bearer realm="MCP Server"'
  });
  res.end(JSON.stringify({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Authentication required',
      data: {
        hint: method === 'Bearer'
          ? 'Provide API key via Authorization: Bearer <token> or X-API-Key header'
          : 'Provide credentials via Authorization: Basic <base64(username:password)>'
      }
    },
    id: null
  }));
}

/**
 * Helper to generate a secure random API key
 */
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'mcp_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * Default auth configuration from environment
 */
export function getAuthConfigFromEnv(): AuthConfig {
  const enabled = process.env.MCP_AUTH_ENABLED === 'true';
  const apiKeysString = process.env.MCP_API_KEYS;
  const apiKeys = apiKeysString ? apiKeysString.split(',').map(k => k.trim()) : undefined;

  // Parse basic auth credentials if provided
  const basicAuthString = process.env.MCP_BASIC_AUTH;
  let basicAuthCredentials: { username: string; password: string }[] | undefined;

  if (basicAuthString) {
    basicAuthCredentials = basicAuthString.split(',').map(cred => {
      const [username, password] = cred.trim().split(':');
      return { username, password };
    });
  }

  return {
    enabled,
    apiKeys,
    basicAuthCredentials
  };
}
