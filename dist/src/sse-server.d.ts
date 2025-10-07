#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export declare function startSSEServer(server: McpServer, port: number): Promise<void>;
