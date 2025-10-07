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
    basicAuthCredentials?: {
        username: string;
        password: string;
    }[];
    /**
     * Custom authentication function
     */
    customAuth?: (req: IncomingMessage) => boolean;
}
/**
 * Validates authentication based on configuration
 */
export declare function validateAuth(req: IncomingMessage, config: AuthConfig): boolean;
/**
 * Sends an authentication required response
 */
export declare function sendAuthRequired(res: ServerResponse, method?: 'Bearer' | 'Basic'): void;
/**
 * Helper to generate a secure random API key
 */
export declare function generateApiKey(): string;
/**
 * Default auth configuration from environment
 */
export declare function getAuthConfigFromEnv(): AuthConfig;
