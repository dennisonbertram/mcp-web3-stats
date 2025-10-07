export function registerPingDuneServerTool(server) {
    server.tool("ping_dune_server", "A simple tool to check if the Dune MCP server is responsive.", {}, async () => {
        return {
            content: [{ type: "text", text: "Pong! Dune MCP server is active." }],
        };
    });
}
