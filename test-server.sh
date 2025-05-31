#!/bin/bash

echo "Testing MCP Web3 Stats Server..."

# Test 1: List tools
echo -e "\n1. Testing tool listing..."
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}\n' | bun ./dist/index.js 2>/dev/null | grep -A5 '"id":2' | head -10

# Test 2: List resources  
echo -e "\n2. Testing resource listing..."
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"resources/list","params":{}}\n' | bun ./dist/index.js 2>/dev/null | grep -A5 '"id":2' | head -10

# Test 3: Test a Dune tool
echo -e "\n3. Testing Dune ping tool..."
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ping_dune_server","arguments":{}}}\n' | bun ./dist/index.js 2>/dev/null | grep -A5 '"id":2'

# Test 4: Test a resource
echo -e "\n4. Testing DEX router resource..."
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"resources/read","params":{"uri":"web3-stats://contracts/dex-routers"}}\n' | bun ./dist/index.js 2>/dev/null | grep -A20 '"id":2' | head -25

echo -e "\nAll tests completed!"