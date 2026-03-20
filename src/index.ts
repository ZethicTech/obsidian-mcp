import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { getPrompt, listPrompts } from "./prompts.js";
import { listResourceTemplates, listResources, readResource } from "./resources.js";
import { allTools, handleToolCall } from "./tools.js";

const name = process.env.PKG_NAME!;
const version = process.env.PKG_VERSION!;

const server = new Server(
  {
    name,
    version,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  },
);

// ─── Tools ────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  const { name, arguments: args } = request.params;
  const progressToken = request.params._meta?.progressToken;

  return handleToolCall(name, (args ?? {}) as Record<string, unknown>, {
    signal: extra.signal,
    onProgress:
      progressToken !== undefined
        ? (progress, total) => {
            server.notification({
              method: "notifications/progress",
              params: { progressToken, progress, total },
            });
          }
        : undefined,
  });
});

// ─── Resources ────────────────────────────────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
  return listResources(request.params?.cursor);
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return readResource(request.params.uri);
});

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  return listResourceTemplates();
});

// ─── Prompts ──────────────────────────────────────────────────────

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return listPrompts();
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  return getPrompt(request.params.name, (request.params.arguments ?? {}) as Record<string, string>);
});

// ─── Start ────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
