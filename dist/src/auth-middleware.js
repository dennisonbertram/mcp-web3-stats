#!/usr/bin/env node
/**
 * Validates authentication based on configuration
 */
export function validateAuth(req, config) {
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
    const apiKeyHeader = req.headers['x-api-key'];
    if (apiKeyHeader && config.apiKeys && config.apiKeys.includes(apiKeyHeader)) {
        return true;
    }
    // Check Basic Authentication
    if (authHeader?.startsWith('Basic ')) {
        const base64Credentials = authHeader.substring(6);
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');
        if (config.basicAuthCredentials) {
            const validCred = config.basicAuthCredentials.find(cred => cred.username === username && cred.password === password);
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
export function sendAuthRequired(res, method = 'Bearer') {
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
export function generateApiKey() {
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
export function getAuthConfigFromEnv() {
    const enabled = process.env.MCP_AUTH_ENABLED === 'true';
    const apiKeysString = process.env.MCP_API_KEYS;
    const apiKeys = apiKeysString ? apiKeysString.split(',').map(k => k.trim()) : undefined;
    // Parse basic auth credentials if provided
    const basicAuthString = process.env.MCP_BASIC_AUTH;
    let basicAuthCredentials;
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
