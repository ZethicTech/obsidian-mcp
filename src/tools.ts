import { z } from "zod";

import { detectTemplateFolders, getVaultPath, runObsidianCli } from "./cli.js";
import { toolSchemas } from "./schemas.js";
import type { ToolDefinition } from "./types.js";

// ─── Helper: generate JSON Schema from Zod ────────────────────────

function zodInputSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema["$schema"];
  return jsonSchema;
}

// ─── Tool metadata (descriptions + annotations) ──────────────────

interface ToolMeta {
  description: string;
  annotations: ToolDefinition["annotations"];
}

// Shared annotation bases — only title and per-tool overrides vary
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;
const DESTRUCTIVE = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
} as const;

const toolMeta: Record<string, ToolMeta> = {
  // Read-only tools
  read_note: {
    description: "Read the full content of a note. Provide either file (wikilink name) or path (exact vault path).",
    annotations: { title: "Read Note", ...READ_ONLY },
  },
  get_file_info: {
    description: "Get metadata about a file (size, dates, type).",
    annotations: { title: "Get File Info", ...READ_ONLY },
  },
  list_files: {
    description: "List files in the vault, optionally filtered by folder or extension.",
    annotations: { title: "List Files", ...READ_ONLY },
  },
  list_folders: { description: "List folders in the vault.", annotations: { title: "List Folders", ...READ_ONLY } },
  search: {
    description: "Search the vault for text matching a query.",
    annotations: { title: "Search", ...READ_ONLY },
  },
  search_with_context: {
    description: "Search the vault with surrounding line context for each match.",
    annotations: { title: "Search with Context", ...READ_ONLY },
  },
  get_backlinks: {
    description: "List all notes that link to the specified note (incoming links).",
    annotations: { title: "Get Backlinks", ...READ_ONLY },
  },
  get_links: {
    description: "List all outgoing links from the specified note.",
    annotations: { title: "Get Links", ...READ_ONLY },
  },
  find_unresolved_links: {
    description: "Find all broken/unresolved links in the vault.",
    annotations: { title: "Find Unresolved Links", ...READ_ONLY },
  },
  find_orphan_notes: {
    description: "Find notes with no incoming links (orphans).",
    annotations: { title: "Find Orphan Notes", ...READ_ONLY },
  },
  get_outline: {
    description: "Get the heading structure/outline of a note.",
    annotations: { title: "Get Outline", ...READ_ONLY },
  },
  get_properties: {
    description: "List properties (frontmatter) of a note or across the vault.",
    annotations: { title: "Get Properties", ...READ_ONLY },
  },
  read_property: {
    description: "Read the value of a specific property from a note.",
    annotations: { title: "Read Property", ...READ_ONLY },
  },
  list_tags: {
    description: "List tags used in the vault or a specific note.",
    annotations: { title: "List Tags", ...READ_ONLY },
  },
  list_tasks: {
    description: "List tasks (checkboxes) in the vault or a specific note.",
    annotations: { title: "List Tasks", ...READ_ONLY },
  },
  daily_read: {
    description: "Read today's daily note content.",
    annotations: { title: "Read Daily Note", ...READ_ONLY },
  },
  daily_path: {
    description: "Get the expected file path for today's daily note.",
    annotations: { title: "Daily Note Path", ...READ_ONLY },
  },
  get_vault_info: {
    description: "Get information about the current vault (name, path, file count, size).",
    annotations: { title: "Get Vault Info", ...READ_ONLY },
  },
  wordcount: {
    description: "Count words and/or characters in a note.",
    annotations: { title: "Word Count", ...READ_ONLY },
  },
  get_help: {
    description: "Get help for Obsidian CLI commands. Omit command for the full command list.",
    annotations: { title: "Get Help", ...READ_ONLY },
  },
  list_templates: {
    description:
      "List available templates in the vault. Auto-detects the template folder from Core Templates and Templater plugin settings. Use folder= to override.",
    annotations: { title: "List Templates", ...READ_ONLY },
  },
  // Write tools
  create_note: {
    description: "Create a new note. Can optionally use a template and set initial content.",
    annotations: { title: "Create Note", ...WRITE },
  },
  append_note: {
    description: "Append content to the end of a note.",
    annotations: { title: "Append to Note", ...WRITE },
  },
  prepend_note: {
    description: "Prepend content to a note (after frontmatter).",
    annotations: { title: "Prepend to Note", ...WRITE },
  },
  set_property: {
    description: "Set a frontmatter property on a note.",
    annotations: { title: "Set Property", ...WRITE, idempotentHint: true },
  },
  daily_create: {
    description: "Open/create today's daily note in Obsidian.",
    annotations: { title: "Create Daily Note", ...WRITE, idempotentHint: true },
  },
  daily_append: {
    description: "Append content to today's daily note.",
    annotations: { title: "Append to Daily Note", ...WRITE },
  },
  daily_prepend: {
    description: "Prepend content to today's daily note (after frontmatter).",
    annotations: { title: "Prepend to Daily Note", ...WRITE },
  },
  update_task: {
    description: "Update a task's status (toggle, mark done/todo, or set custom status).",
    annotations: { title: "Update Task", ...WRITE, idempotentHint: true },
  },
  add_bookmark: {
    description: "Add a bookmark to a file, folder, search, or URL.",
    annotations: { title: "Add Bookmark", ...WRITE },
  },
  // Destructive tools
  move_note: {
    description: "Move or rename a note to a new path. Automatically updates all links.",
    annotations: { title: "Move Note", ...DESTRUCTIVE },
  },
  rename_note: {
    description: "Rename a note (preserves extension). Updates all links.",
    annotations: { title: "Rename Note", ...DESTRUCTIVE },
  },
  delete_note: {
    description: "Delete a note. By default moves to trash; use permanent=true to skip trash.",
    annotations: { title: "Delete Note", ...DESTRUCTIVE },
  },
  remove_property: {
    description: "Remove a frontmatter property from a note.",
    annotations: { title: "Remove Property", ...DESTRUCTIVE, idempotentHint: true },
  },
  run_command: {
    description:
      "Run any Obsidian CLI command directly. Use get_help to discover available commands. " +
      "This is an escape hatch for the ~80 CLI commands not exposed as dedicated tools " +
      "(sync, plugins, themes, templates, workspaces, publish, dev tools, etc.).",
    annotations: { title: "Run CLI Command", ...DESTRUCTIVE },
  },
};

// ─── Tool category lists (by name) ───────────────────────────────

const readOnlyToolNames = [
  "read_note",
  "get_file_info",
  "list_files",
  "list_folders",
  "search",
  "search_with_context",
  "get_backlinks",
  "get_links",
  "find_unresolved_links",
  "find_orphan_notes",
  "get_outline",
  "get_properties",
  "read_property",
  "list_tags",
  "list_tasks",
  "daily_read",
  "daily_path",
  "get_vault_info",
  "wordcount",
  "get_help",
  "list_templates",
];

const writeToolNames = [
  "create_note",
  "append_note",
  "prepend_note",
  "set_property",
  "daily_create",
  "daily_append",
  "daily_prepend",
  "update_task",
  "add_bookmark",
];

const destructiveToolNames = ["move_note", "rename_note", "delete_note", "remove_property", "run_command"];

// ─── Build ToolDefinition arrays from Zod schemas + metadata ─────

function buildTools(names: string[]): ToolDefinition[] {
  return names.map((name) => {
    const schema = toolSchemas[name];
    const meta = toolMeta[name];
    if (!schema || !meta) {
      throw new Error(`Missing schema or metadata for tool: ${name}`);
    }
    return {
      name,
      description: meta.description,
      inputSchema: zodInputSchema(schema),
      annotations: meta.annotations,
    };
  });
}

export const readOnlyTools: ToolDefinition[] = buildTools(readOnlyToolNames);
export const writeTools: ToolDefinition[] = buildTools(writeToolNames);
export const destructiveTools: ToolDefinition[] = buildTools(destructiveToolNames);
export const allTools: ToolDefinition[] = [...readOnlyTools, ...writeTools, ...destructiveTools];

// ─── Command mapping ──────────────────────────────────────────────

export const commandMap: Record<string, string> = {
  read_note: "read",
  get_file_info: "file",
  list_files: "files",
  list_folders: "folders",
  search: "search",
  search_with_context: "search:context",
  get_backlinks: "backlinks",
  get_links: "links",
  find_unresolved_links: "unresolved",
  find_orphan_notes: "orphans",
  get_outline: "outline",
  get_properties: "properties",
  read_property: "property:read",
  list_tags: "tags",
  list_tasks: "tasks",
  daily_read: "daily:read",
  daily_path: "daily:path",
  get_vault_info: "vault",
  wordcount: "wordcount",
  get_help: "help",
  create_note: "create",
  append_note: "append",
  prepend_note: "prepend",
  set_property: "property:set",
  daily_create: "daily",
  daily_append: "daily:append",
  daily_prepend: "daily:prepend",
  update_task: "task",
  add_bookmark: "bookmark",
  move_note: "move",
  rename_note: "rename",
  delete_note: "delete",
  remove_property: "property:remove",
};

// ─── Tool handler ──────────────────────────────────────────────────

// Parameters that are boolean flags (passed as bare words without value)
export const booleanFlags = new Set([
  "total",
  "counts",
  "verbose",
  "active",
  "case",
  "overwrite",
  "open",
  "newtab",
  "inline",
  "permanent",
  "toggle",
  "done",
  "todo",
  "words",
  "characters",
  "copy",
  "daily",
]);

export interface HandleToolCallOptions {
  signal?: AbortSignal;
  onProgress?: (progress: number, total: number) => void;
}

export async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  options?: HandleToolCallOptions,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    // Resolve command before validation to fail fast on unknown tools
    let command: string;
    let params: Record<string, unknown>;
    let flags: string[] | undefined;

    if (toolName === "list_templates") {
      // Validate input
      const schema = toolSchemas[toolName];
      if (schema) {
        const result = schema.safeParse(args);
        if (!result.success) {
          const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
          return { content: [{ type: "text", text: `Invalid input: ${issues}` }], isError: true };
        }
      }

      options?.onProgress?.(0, 1);

      const vaultPath = await getVaultPath();
      const folderOverride = args.folder as string | undefined;

      let folders: Array<{ source: string; folder: string }>;
      if (folderOverride) {
        folders = [{ source: "Manual", folder: folderOverride }];
      } else {
        folders = await detectTemplateFolders(vaultPath);
        if (folders.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No template folder configured. Set a template folder in Obsidian Settings > Core Plugins > Templates, or use the folder parameter to specify one.",
              },
            ],
            isError: true,
          };
        }
      }

      const sections: string[] = [];
      for (const { source, folder } of folders) {
        const cliResult = await runObsidianCli("files", { folder, ext: "md" });
        const files = cliResult.stdout?.trim();
        if (!files) {
          sections.push(`${source} (folder: "${folder}"): No templates found.`);
          continue;
        }
        const names = files
          .split("\n")
          .map((f) => f.replace(/\.md$/, ""))
          .map((n) => `- ${n}`)
          .join("\n");
        sections.push(`${source} (folder: "${folder}"):\n${names}`);
      }

      options?.onProgress?.(1, 1);

      return { content: [{ type: "text", text: sections.join("\n\n") }] };
    }

    if (toolName === "run_command") {
      command = args.command as string;
      params = (args.args as Record<string, unknown>) ?? {};
      flags = (args.flags as string[]) ?? [];
    } else {
      command = commandMap[toolName];
      if (!command) {
        return {
          content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
          isError: true,
        };
      }

      // Separate boolean flags from key=value params
      params = {};
      flags = [];
      for (const [key, value] of Object.entries(args)) {
        if (value === undefined || value === null) continue;
        if (booleanFlags.has(key) && value === true) {
          flags.push(key);
        } else if (typeof value === "boolean" && !value) {
          continue;
        } else {
          params[key] = value;
        }
      }
    }

    // Validate input against Zod schema
    const schema = toolSchemas[toolName];
    if (schema) {
      const result = schema.safeParse(args);
      if (!result.success) {
        const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        return {
          content: [{ type: "text", text: `Invalid input: ${issues}` }],
          isError: true,
        };
      }
    }

    // Emit progress: starting
    options?.onProgress?.(0, 1);

    const result = await runObsidianCli(command, params, flags, undefined, { signal: options?.signal });

    // Emit progress: complete
    options?.onProgress?.(1, 1);

    if (result.stderr && !result.stdout) {
      return {
        content: [{ type: "text", text: result.stderr }],
        isError: true,
      };
    }

    const output = result.stdout || result.stderr || "Command completed successfully.";
    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: message }],
      isError: true,
    };
  }
}
