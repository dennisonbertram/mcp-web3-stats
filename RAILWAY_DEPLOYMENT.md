# Deploying MCP Web3 Stats to Railway

This guide covers deploying the MCP Web3 Stats server to Railway with proper authentication and security.

## Prerequisites

- Railway account ([railway.app](https://railway.app))
- GitHub repository connected to Railway
- Dune API key

## Quick Deploy

### 1. Create New Railway Project

```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project (or use the dashboard)
railway init
```

### 2. Configure Environment Variables

In the Railway dashboard or via CLI, set these environment variables:

#### Required Variables

```bash
# Dune API Configuration
DUNE_API_KEY=your_dune_api_key_here

# Railway automatically sets PORT - no configuration needed
# Server binds to :: (IPv6 wildcard) for Railway compatibility
# :: accepts both IPv4 and IPv6 connections
```

#### Authentication Variables (Highly Recommended)

```bash
# Enable authentication for public deployment
MCP_AUTH_ENABLED=true

# API Key authentication (recommended)
MCP_API_KEYS=mcp_your_secret_key_here,mcp_another_key_here

# OR Basic Authentication
MCP_BASIC_AUTH=admin:your_secure_password,user2:another_password
```

**Generate secure API keys:**
```bash
# Generate a secure random API key
node -e "console.log('mcp_' + require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Deploy

Railway will automatically:
1. Detect the `railway.json` configuration
2. Build using `npm install && npm run build`
3. Start with `node dist/src/index.js --transport http --port $PORT`
4. Expose the service on a public URL

## Authentication Methods

### Method 1: Bearer Token (Recommended)

**Client Request:**
```bash
curl -X POST https://your-app.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer mcp_your_secret_key_here" \
  -H "MCP-Protocol-Version: 2025-03-26" \
  -d '{"jsonrpc":"2.0","method":"initialize",...}'
```

### Method 2: X-API-Key Header

**Client Request:**
```bash
curl -X POST https://your-app.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "X-API-Key: mcp_your_secret_key_here" \
  -H "MCP-Protocol-Version: 2025-03-26" \
  -d '{"jsonrpc":"2.0","method":"initialize",...}'
```

### Method 3: Basic Authentication

**Client Request:**
```bash
curl -X POST https://your-app.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Basic $(echo -n 'admin:your_secure_password' | base64)" \
  -H "MCP-Protocol-Version: 2025-03-26" \
  -d '{"jsonrpc":"2.0","method":"initialize",...}'
```

## Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DUNE_API_KEY` | ✅ Yes | - | Your Dune Analytics API key |
| `PORT` | Auto | 3000 | Railway sets this automatically |
| `MCP_BIND_HOST` | No | `::` | Defaults to :: (IPv6 wildcard) for Railway compatibility |
| `MCP_AUTH_ENABLED` | No | `false` | Enable authentication (set to `true` for production) |
| `MCP_API_KEYS` | No | - | Comma-separated list of valid API keys |
| `MCP_BASIC_AUTH` | No | - | Comma-separated `username:password` pairs |

## Security Best Practices

### 1. Always Enable Authentication in Production

```bash
MCP_AUTH_ENABLED=true
MCP_API_KEYS=mcp_long_random_string_here
```

### 2. Use Strong API Keys

- Minimum 32 characters
- Use cryptographically random generation
- Rotate keys periodically
- Use different keys per client/environment

### 3. Monitor Access

Railway provides logs. Monitor for:
- Failed authentication attempts (401 responses)
- Unusual traffic patterns
- High request rates from single IPs

### 4. Rate Limiting (Optional Enhancement)

Consider adding Cloudflare in front of Railway for:
- DDoS protection
- Rate limiting
- Additional caching
- Web Application Firewall (WAF)

## Architecture

```
┌─────────────────┐
│   Client App    │
│  (Claude, etc)  │
└────────┬────────┘
         │ HTTPS + Auth
         ▼
┌─────────────────┐
│  Railway CDN    │
│  (Auto HTTPS)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MCP Server     │
│  (Node.js)      │
│  Port: $PORT    │
│  Auth: Enabled  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Dune API       │
│  Blockscout     │
└─────────────────┘
```

## Testing Your Deployment

### 1. Health Check (No Auth Required)

```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "2.0.0",
  "sessions": 0
}
```

### 2. Initialize Session (Auth Required)

```bash
curl -i -X POST https://your-app.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "MCP-Protocol-Version: 2025-03-26" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    },
    "id": 1
  }'
```

Look for `mcp-session-id` in response headers.

### 3. Test Tool Call

```bash
curl -X POST https://your-app.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Mcp-Session-Id: SESSION_ID_FROM_INIT" \
  -H "MCP-Protocol-Version: 2025-03-26" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}'
```

## Connecting from Claude Desktop

Add to your Claude Desktop configuration:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "web3-stats-railway": {
      "url": "https://your-app.railway.app/mcp",
      "transport": {
        "type": "http"
      },
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

## Cost Considerations

### Railway Pricing (as of 2025)

- **Hobby Plan**: $5/month + usage
- **Pro Plan**: $20/month + usage
- **Usage**: ~$0.000463/minute of execution

### Estimated Costs

For moderate usage (24/7 availability):
- Base: $5/month (Hobby) or $20/month (Pro)
- Compute: ~$20-40/month for continuous running
- **Total: ~$25-60/month**

### Cost Optimization Tips

1. **Use Sleep Mode**: Configure Railway to sleep after inactivity
2. **Scale Down**: Use smallest instance size that meets performance needs
3. **Monitor Usage**: Check Railway dashboard regularly
4. **Consider Alternatives**: For high usage, consider AWS/GCP for better pricing

## Troubleshooting

### Issue: Server won't start

**Check:**
- `DUNE_API_KEY` is set
- Server binds to `::` (IPv6 wildcard - default behavior)
- Build completed successfully

**View logs:**
```bash
railway logs
```

### Issue: Authentication always fails

**Check:**
- `MCP_AUTH_ENABLED=true` is set
- `MCP_API_KEYS` contains valid keys
- Client is sending correct header format
- No typos in API key

### Issue: 502 Bad Gateway

**Possible causes:**
- Server crashed (check logs)
- Port binding issue (ensure using Railway's `$PORT`)
- Health check failing (verify `/health` endpoint)

### Issue: High response times

**Solutions:**
- Check Dune API rate limits
- Enable Railway's caching
- Consider upgrading instance size
- Add Cloudflare CDN

## Monitoring & Maintenance

### Railway Dashboard

Monitor:
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Server output, errors, auth failures
- **Deployments**: Build status, rollback options

### Health Monitoring

Set up external monitoring (e.g., UptimeRobot, Pingdom):
- Endpoint: `https://your-app.railway.app/health`
- Interval: 5 minutes
- Alert on: Status != 200 or 3 consecutive failures

### Log Analysis

Key patterns to monitor:
```bash
# Authentication failures
railway logs | grep "401"

# Session activity
railway logs | grep "Session initialized"
railway logs | grep "Session closed"

# Errors
railway logs | grep "ERROR"
railway logs | grep "error"
```

## Scaling Considerations

### Horizontal Scaling (Multiple Instances)

⚠️ **Not recommended** without stateful session storage:
- Current implementation uses in-memory session storage
- Multiple instances won't share sessions
- Use sticky sessions if scaling horizontally

### Vertical Scaling (Larger Instance)

✅ **Recommended approach**:
- Upgrade instance size in Railway dashboard
- More CPU/memory for concurrent requests
- No code changes needed

## Alternative Deployment Platforms

While this guide focuses on Railway, the server can also deploy to:

### **Fly.io**
- Similar to Railway
- More control over regions
- Slightly lower costs

### **Render**
- Similar pricing to Railway
- Easy setup
- Built-in SSL

### **AWS/GCP/Azure**
- More complex setup
- Better for high scale
- More cost-effective at high usage

### **Self-Hosted**
- Full control
- Zero platform costs
- Requires server management

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Configure authentication
3. ✅ Test all endpoints
4. ✅ Set up monitoring
5. ✅ Configure Claude Desktop to use your deployment
6. 🎉 Start analyzing blockchain data!

## Support

For issues or questions:
- **Railway**: [railway.app/help](https://railway.app/help)
- **MCP Server**: [GitHub Issues](https://github.com/dennisonbertram/mcp-web3-stats/issues)
- **MCP Protocol**: [modelcontextprotocol.io](https://modelcontextprotocol.io)
