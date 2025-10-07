# Configuring MCP Clients for Web3 Stats Server

This guide shows how to connect Claude Desktop and Claude Code to your Railway-deployed MCP Web3 Stats server.

## Configuration Overview

Your MCP server is deployed at:
- **URL**: `https://mcp-web3-stats-production.up.railway.app`
- **Transport**: HTTP (Streamable HTTP)
- **Protocol**: MCP 2025-03-26
- **Authentication**: Required (Bearer token or X-API-Key)

## Claude Desktop Configuration

### 1. Locate Configuration File

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```bash
~/.config/Claude/claude_desktop_config.json
```

### 2. Add Server Configuration

Open the configuration file and add your server.

**Option A: Using Environment Variable (Recommended - More Secure)**

```json
{
  "mcpServers": {
    "web3-stats": {
      "transport": "http",
      "url": "https://mcp-web3-stats-production.up.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer ${MCP_WEB3_API_KEY}"
      }
    }
  }
}
```

Then set the environment variable:
```bash
# macOS/Linux - Add to ~/.zshrc or ~/.bashrc
export MCP_WEB3_API_KEY="your_api_key_here"

# Then restart terminal and Claude Desktop
```

**⚠️ Known Issue:** There's a bug in some Claude versions where environment variable substitution in headers doesn't work correctly. If this doesn't work, use Option B.

**Option B: Hardcoded API Key (Works Reliably)**

```json
{
  "mcpServers": {
    "web3-stats": {
      "transport": "http",
      "url": "https://mcp-web3-stats-production.up.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY_HERE"
      }
    }
  }
}
```

**Or using X-API-Key header:**

```json
{
  "mcpServers": {
    "web3-stats": {
      "transport": "http",
      "url": "https://mcp-web3-stats-production.up.railway.app/mcp",
      "headers": {
        "X-API-Key": "${MCP_WEB3_API_KEY}"
      }
    }
  }
}
```

**Note:** Environment variable substitution uses `${VAR}` syntax. Fallback values are also supported: `${VAR:-default_value}`

### 3. Get Your API Key

Your API keys are stored in Railway environment variables. Check your Railway dashboard:

1. Go to your Railway project
2. Click on "Variables" tab
3. Look for `MCP_API_KEYS`
4. Use one of the comma-separated keys

### 4. Restart Claude Desktop

After saving the configuration, restart Claude Desktop to load the new MCP server.

### 5. Verify Connection

In Claude Desktop:
1. Start a new conversation
2. Type a message that would use Web3 data
3. Look for the Web3 Stats tools in the available tools

## Understanding `headers` vs `env`

**Important distinction:**

- **`headers`**: Used for **HTTP transport** MCP servers (like yours on Railway)
  - Sends HTTP headers with each request
  - Example: `"headers": {"Authorization": "Bearer key"}`

- **`env`**: Used for **stdio/command transport** MCP servers (local processes)
  - Sets environment variables for the spawned process
  - Example: `"env": {"API_KEY": "key"}`

Since your server uses HTTP transport, you use `headers`, not `env`.

**Example of stdio transport (for comparison):**
```json
{
  "mcpServers": {
    "local-server": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "API_KEY": "value"
      }
    }
  }
}
```

## Claude Code Configuration

Claude Code uses a different configuration approach.

### 1. Locate MCP Settings

**macOS/Linux:**
```bash
~/.claude/mcp_settings.json
```

**Windows:**
```
%USERPROFILE%\.claude\mcp_settings.json
```

### 2. Add Server Configuration

```json
{
  "mcpServers": {
    "web3-stats": {
      "transport": "http",
      "url": "https://mcp-web3-stats-production.up.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### 3. Restart Claude Code

Exit and restart Claude Code CLI to load the new configuration.

### 4. Verify in Claude Code

```bash
# Check if server is connected
claude mcp list

# You should see "web3-stats" in the list
```

## Complete Configuration Examples

### Multiple MCP Servers

If you already have other MCP servers configured:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
    },
    "web3-stats": {
      "transport": "http",
      "url": "https://mcp-web3-stats-production.up.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY_HERE"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your_github_token"
      }
    }
  }
}
```

### With Additional Headers

```json
{
  "mcpServers": {
    "web3-stats": {
      "transport": "http",
      "url": "https://mcp-web3-stats-production.up.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY_HERE",
        "User-Agent": "Claude-Desktop/1.0",
        "X-Client-Id": "my-custom-client"
      }
    }
  }
}
```

## Available Tools

Once configured, you'll have access to these tools:

### Ethereum Tools
- `get_eth_price` - Get current ETH price
- `get_eth_balance` - Get ETH balance for address
- `get_transaction` - Get transaction details
- `get_block` - Get block information
- `get_gas_price` - Get current gas price

### DeFi Tools
- `get_uniswap_pool` - Get Uniswap pool data
- `get_token_price` - Get token price from DEX
- `calculate_impermanent_loss` - Calculate IL for LP positions

### Analytics Tools
- `get_dune_query` - Execute Dune Analytics queries
- `get_wallet_analysis` - Analyze wallet activity
- `get_token_holders` - Get token holder distribution

### Chain Analysis Tools
- `get_contract_info` - Get smart contract details
- `verify_contract` - Verify contract on block explorer
- `get_nft_metadata` - Get NFT metadata

## Troubleshooting

### Error: "Connection refused"

**Cause:** URL is incorrect or server is down

**Solution:**
```bash
# Test the health endpoint
curl https://mcp-web3-stats-production.up.railway.app/health

# Should return: {"status":"ok","version":"2.0.0"}
```

### Error: "Authentication required"

**Cause:** Missing or invalid API key

**Solutions:**
1. Check that your API key is correct in Railway dashboard
2. Ensure header format is correct:
   - `"Authorization": "Bearer YOUR_KEY"` (note: "Bearer " prefix)
   - OR `"X-API-Key": "YOUR_KEY"` (no prefix)
3. Make sure there are no extra spaces or quotes

### Error: "Invalid protocol version"

**Cause:** MCP protocol version mismatch

**Solution:**
Make sure your Claude Desktop/Code is up to date. This server uses MCP protocol version `2025-03-26`.

### Server Not Appearing in Tools List

**Causes & Solutions:**

1. **Configuration file syntax error**
   - Validate your JSON: `cat ~/.config/Claude/claude_desktop_config.json | jq`
   - Fix any JSON syntax errors

2. **Configuration file not in correct location**
   - Double-check the file path for your OS
   - Create directories if they don't exist: `mkdir -p ~/.config/Claude`

3. **Claude not restarted**
   - Completely quit Claude Desktop/Code
   - Restart the application

4. **Server connection failing**
   - Check Railway logs: `railway logs`
   - Verify server is running: `curl https://mcp-web3-stats-production.up.railway.app/health`

### Testing Configuration

Test your configuration manually before adding to Claude:

```bash
# Initialize session
curl -X POST https://mcp-web3-stats-production.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "MCP-Protocol-Version: 2025-03-26" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    },
    "id": 1
  }'

# Should return initialization response with server capabilities
```

## Security Best Practices

### 1. Secure API Key Storage

**Don't** store API keys in:
- Version control (git)
- Public documentation
- Shared configuration files

**Do** store API keys in:
- Environment variables (for scripts)
- Secure password managers
- OS keychain (macOS Keychain, Windows Credential Manager)

### 2. API Key Rotation

Regularly rotate your API keys:

```bash
# Generate new API key
node -e "console.log('mcp_' + require('crypto').randomBytes(32).toString('hex'))"

# Update Railway environment variable
railway variables set MCP_API_KEYS=new_key1,new_key2

# Update local configuration
# Edit claude_desktop_config.json with new key
```

### 3. Monitor Access

Check Railway logs for suspicious activity:

```bash
railway logs --tail 100
```

## Local Development Configuration

For testing with local development server:

```json
{
  "mcpServers": {
    "web3-stats-local": {
      "transport": "http",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "X-API-Key": "test_key"
      }
    }
  }
}
```

## Alternative: Using Custom Domain

If you set up a custom domain on Railway:

```json
{
  "mcpServers": {
    "web3-stats": {
      "transport": "http",
      "url": "https://api.yourdomain.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

## Getting Help

If you encounter issues:

1. **Check server health:**
   ```bash
   curl https://mcp-web3-stats-production.up.railway.app/health
   ```

2. **Check Railway logs:**
   ```bash
   railway logs
   ```

3. **Validate configuration JSON:**
   ```bash
   cat ~/.config/Claude/claude_desktop_config.json | jq
   ```

4. **Test authentication:**
   ```bash
   curl -X POST https://mcp-web3-stats-production.up.railway.app/mcp \
     -H "Authorization: Bearer YOUR_KEY" \
     -H "Content-Type: application/json" \
     -H "MCP-Protocol-Version: 2025-03-26" \
     -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}'
   ```

## Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Claude Desktop Documentation](https://claude.ai/docs)
- [Railway Documentation](https://docs.railway.com/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

---

**Quick Start Checklist:**

- [ ] Find your API key in Railway dashboard
- [ ] Locate Claude Desktop/Code config file
- [ ] Add server configuration with correct URL and auth header
- [ ] Save configuration file
- [ ] Restart Claude Desktop/Code
- [ ] Verify server appears in tools list
- [ ] Test a Web3-related query
