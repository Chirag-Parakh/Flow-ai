import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ALL_TOOLS } from "./registry.js";
import { logger } from "../utils/logger";

/**
 * Creates and configures an MCP server using the high-level {@link McpServer} API
 * (registers one tool per entry in {@link ALL_TOOLS}).
 */
export function createMcpServer(): McpServer {
  const mcp = new McpServer(
    { name: "flow-mcp-server", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  for (const tool of ALL_TOOLS) {
    mcp.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.schema,
      },
      async (args) => {
        logger.debug(`MCP tool call: ${tool.name}`, { args });
        try {
          const result = await tool.execute(args ?? {});
          return {
            content: [
              {
                type: "text" as const,
                text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error(`Tool "${tool.name}" failed: ${message}`);
          return {
            isError: true,
            content: [{ type: "text" as const, text: message }],
          };
        }
      }
    );
  }

  return mcp;
}
