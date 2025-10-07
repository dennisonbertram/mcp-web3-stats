# How to Deploy an MCP Server to Railway

This guide documents the complete process and requirements for deploying a Model Context Protocol (MCP) server to Railway, based on successfully deploying the MCP Web3 Stats server.

## Table of Contents

- [Critical Requirements](#critical-requirements)
- [Prerequisites](#prerequisites)
- [Step-by-Step Deployment](#step-by-step-deployment)
- [Configuration Files](#configuration-files)
- [Common Issues & Solutions](#common-issues--solutions)
- [Testing Your Deployment](#testing-your-deployment)

## Critical Requirements

### 1. IPv6 Binding (MOST IMPORTANT)

**Railway requires servers to bind to `::` (IPv6 wildcard), not `0.0.0.0`**

This is the #1 cause of health check failures on Railway. The `::` binding accepts both IPv4 and IPv6 connections, which Railway's infrastructure requires for proper traffic routing.

```typescript
// ❌ WRONG - Will cause health check failures
const host = '0.0.0.0';
httpServer.listen(port, host, () => { ... });

// ❌ WRONG - localhost only
const host = '127.0.0.1';
httpServer.listen(port, host, () => { ... });

// ✅ CORRECT - Railway compatible
const host = process.env.MCP_BIND_HOST || '::';
httpServer.listen(port, host, () => { ... });
```

### 2. PORT Environment Variable

Railway dynamically assigns a port via the `PORT` environment variable. Your server MUST read and use this port:

```typescript
// ✅ CORRECT
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// ❌ WRONG - Hardcoded port
const port = 3000;
```

### 3. Health Check Endpoint

Railway needs a `/health` endpoint to verify your server is running. This endpoint must:
- Return HTTP 200 status
- Be accessible BEFORE any authentication
- Respond within 300 seconds (5 minutes) on first startup

```typescript
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

// Auth validation comes AFTER health check
if (!validateAuth(req, auth)) {
  sendAuthRequired(res);
  return;
}
```

### 4. Build System Compatibility

Railway uses Nixpacks which includes `npm`/`npx` by default, but NOT `bun`/`bunx`. Configure your build accordingly:

```json
// package.json
{
  "scripts": {
    "build": "npx tsc",  // ✅ Use npx, not bunx
    "start": "node dist/src/index.js"
  }
}
```

## Prerequisites

- Railway account ([railway.app](https://railway.app))
- GitHub repository with your MCP server code
- Node.js ≥ 20.0.0
- TypeScript project with proper build configuration

## Step-by-Step Deployment

### Step 1: Prepare Your MCP Server Code

#### 1.1 Configure Server Binding

Update your HTTP server to bind to IPv6:

```typescript
// src/server.ts (or your main server file)
import { createServer } from 'node:http';

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${port}`);

  // Health check MUST be first
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      version: '1.0.0',
      uptime: process.uptime()
    }));
    return;
  }

  // Your authentication/routing logic here
  // ...
});

// Critical: Use :: for Railway compatibility
const host = process.env.MCP_BIND_HOST || '::';
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

httpServer.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
  console.log(`Health check: http://${host}:${port}/health`);
});
```

#### 1.2 Update package.json

Ensure your build scripts use `npx`:

```json
{
  "name": "your-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "npx tsc",
    "start": "node dist/src/index.js",
    "dev": "npx tsc && node dist/src/index.js"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### Step 2: Create railway.json

Create a `railway.json` file in your project root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "node dist/src/index.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Key points:**
- `buildCommand`: Use `npm install`, not `bun install`
- `startCommand`: Simple command without shell variable expansion
- `healthcheckPath`: Must match your health endpoint
- `healthcheckTimeout`: 300 seconds (5 minutes) for initial startup

### Step 3: Push to GitHub

```bash
git add -A
git commit -m "feat: Add Railway deployment configuration"
git push origin main
```

### Step 4: Connect to Railway

1. Go to [railway.app](https://railway.app) and log in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will automatically detect Node.js and start building

### Step 5: Configure Environment Variables

In the Railway dashboard, go to your project → Variables and add:

**Required Variables:**
```bash
# Your API keys (example for this project)
DUNE_API_KEY=your_api_key_here

# Railway sets PORT automatically - DO NOT SET MANUALLY
```

**Optional Variables:**
```bash
# Only set if you need to override default binding (usually not needed)
MCP_BIND_HOST=::

# Authentication (recommended for production)
MCP_AUTH_ENABLED=true
MCP_API_KEYS=mcp_key1,mcp_key2
```

### Step 6: Monitor Deployment

Watch the deployment logs:

```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# View logs
railway logs
```

**Success indicators:**
- Build completes successfully
- Server logs show: `Server running at http://:::$PORT/`
- Health check passes
- Service shows as "Active" in Railway dashboard

## Configuration Files

### railway.json (Complete Example)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "node dist/src/index.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### tsconfig.json (Recommended)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Common Issues & Solutions

### Issue 1: Health Check Keeps Failing

**Symptoms:**
```
Attempt #1 failed with service unavailable
Continuing to retry for 4m49s
```

**Causes & Solutions:**

1. **Server binding to wrong address**
   ```typescript
   // ❌ WRONG
   const host = '127.0.0.1';  // localhost only
   const host = '0.0.0.0';    // IPv4 only

   // ✅ CORRECT
   const host = '::';          // IPv6 wildcard
   ```

2. **Health endpoint blocked by auth**
   ```typescript
   // ✅ Health check MUST come before auth
   if (url.pathname === '/health') {
     return res.end(JSON.stringify({ status: 'ok' }));
   }

   // Auth validation after health check
   if (!validateAuth(req)) {
     return sendAuthRequired(res);
   }
   ```

3. **Not reading PORT environment variable**
   ```typescript
   // ❌ WRONG
   const port = 3000;

   // ✅ CORRECT
   const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
   ```

### Issue 2: Build Fails with "bun: command not found"

**Symptoms:**
```
bun: command not found
Error: Build failed
```

**Solution:**
Change `railway.json` and `package.json` to use npm:

```json
// railway.json
{
  "build": {
    "buildCommand": "npm install && npm run build"  // Not bun
  }
}

// package.json
{
  "scripts": {
    "build": "npx tsc"  // Not bunx tsc
  }
}
```

### Issue 3: Server Shows "Running" but Unreachable

**Symptoms:**
- Logs show: `Server running at http://127.0.0.1:3000/`
- Health checks fail
- Cannot access service URL

**Solution:**
Change binding from `127.0.0.1` to `::`:

```typescript
const host = process.env.MCP_BIND_HOST || '::';
```

### Issue 4: "Application Failed to Respond"

**Symptoms:**
```
Application failed to respond
Error: Service unavailable
```

**Debugging steps:**

1. Check Railway logs: `railway logs`
2. Verify server is reading PORT:
   ```typescript
   console.log(`PORT from env: ${process.env.PORT}`);
   ```
3. Verify binding:
   ```typescript
   console.log(`Binding to host: ${host}`);
   ```
4. Test health endpoint locally:
   ```bash
   curl http://127.0.0.1:3000/health
   ```

## Testing Your Deployment

### Local Testing with Railway-like Environment

Simulate Railway's environment locally:

```bash
# Test with IPv6 binding
PORT=3460 node dist/src/index.js

# In another terminal, test both IPv4 and IPv6
curl http://127.0.0.1:3460/health      # IPv4
curl 'http://[::1]:3460/health'        # IPv6
```

**Expected output:**
```json
{"status":"ok","version":"1.0.0","uptime":5.123}
```

### Testing on Railway

Once deployed, test your Railway URL:

```bash
# Get your Railway URL from the dashboard
RAILWAY_URL="https://your-service.railway.app"

# Test health endpoint
curl $RAILWAY_URL/health

# Test MCP initialization (if using HTTP transport)
curl -X POST $RAILWAY_URL/mcp \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2025-03-26" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'
```

## Best Practices

### 1. Environment Variable Management

- ✅ Use Railway's built-in environment variables
- ✅ Keep secrets in Railway, never in code
- ✅ Use `.env.example` to document required variables
- ❌ Don't commit `.env` files to git

### 2. Logging

```typescript
// Good logging for Railway
console.log(`Server starting...`);
console.log(`PORT: ${port}`);
console.log(`HOST: ${host}`);
console.log(`AUTH: ${auth.enabled ? 'enabled' : 'disabled'}`);
console.log(`Health check: http://${host}:${port}/health`);
```

### 3. Health Checks

```typescript
// Comprehensive health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.RAILWAY_ENVIRONMENT || 'development'
  });
});
```

### 4. Graceful Shutdown

```typescript
// Handle SIGTERM for graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

## Quick Reference Checklist

Before deploying to Railway, verify:

- [ ] Server binds to `::` (IPv6 wildcard)
- [ ] Server reads `process.env.PORT`
- [ ] `/health` endpoint exists and returns 200
- [ ] Health check runs BEFORE authentication
- [ ] Build uses `npm`/`npx`, not `bun`/`bunx`
- [ ] `railway.json` configured correctly
- [ ] Required environment variables documented
- [ ] Local testing passes with `PORT` env var
- [ ] No hardcoded ports or hosts in code
- [ ] `.gitignore` includes `node_modules`, `dist`, `.env`

## Additional Resources

- [Railway Documentation](https://docs.railway.com/)
- [Railway Health Checks](https://docs.railway.com/guides/healthchecks)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## Troubleshooting Commands

```bash
# View Railway logs
railway logs

# Check environment variables
railway variables

# Force rebuild
git commit --allow-empty -m "trigger: Force Railway rebuild"
git push origin main

# Local testing with Railway-like environment
PORT=3000 node dist/src/index.js

# Test health endpoint
curl http://127.0.0.1:3000/health
curl 'http://[::1]:3000/health'
```

---

## Summary

The key to successfully deploying an MCP server to Railway is:

1. **Bind to `::`** (IPv6 wildcard), not `0.0.0.0` or `127.0.0.1`
2. **Read PORT** from `process.env.PORT`
3. **Health check** at `/health` that runs before auth
4. **Use npm/npx** in build commands, not bun/bunx
5. **Test locally** with Railway-like environment before deploying

Follow these requirements and your MCP server will deploy successfully to Railway on the first try.
