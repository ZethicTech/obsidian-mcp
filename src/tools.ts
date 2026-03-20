import { runObsidianCli } from "./cli.js";
import type { ToolDefinition } from "./types.js";

// Reusable schema fragments
const fileOrPath = {
  file: {
    type: "string" as const,
    description: "Note name (wikilink-style resolution)",
  },
  path: {
    type: "string" as const,
    description: "Exact path from vault root",
  },
};

// ─── Read-only tools ───────────────────────────────────────────────

export const readOnlyTools: ToolDefinition[] = [
  {
    name: "read_note",
    description: "Read the full content of a note. Provide either file (wikilink name) or path (exact vault path).",
    inputSchema: {
      type: "object",
      properties: { ...fileOrPath },
    },
    annotations: {
      title: "Read Note",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "get_file_info",
    description: "Get metadata about a file (size, dates, type).",
    inputSchema: {
      type: "object",
      properties: { ...fileOrPath },
    },
    annotations: {
      title: "Get File Info",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "list_files",
    description: "List files in the vault, optionally filtered by folder or extension.",
    inputSchema: {
      type: "object",
      properties: {
        folder: { type: "string", description: "Limit to folder" },
        ext: { type: "string", description: "Filter by extension (e.g. 'md')" },
        total: { type: "boolean", description: "Show only the total count" },
      },
    },
    annotations: {
      title: "List Files",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "list_folders",
    description: "List folders in the vault.",
    inputSchema: {
      type: "object",
      properties: {
        folder: { type: "string", description: "Limit to parent folder" },
        total: { type: "boolean", description: "Show only the total count" },
      },
    },
    annotations: {
      title: "List Folders",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "search",
    description: "Search the vault for text matching a query.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        path: { type: "string", description: "Limit to path" },
        limit: { type: "number", description: "Max results" },
        format: { type: "string", enum: ["text", "json"], description: "Output format" },
        total: { type: "boolean", description: "Show only the total count" },
        case: { type: "boolean", description: "Case-sensitive search" },
      },
      required: ["query"],
    },
    annotations: {
      title: "Search",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "search_with_context",
    description: "Search the vault with surrounding line context for each match.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        path: { type: "string", description: "Limit to path" },
        limit: { type: "number", description: "Max results" },
        format: { type: "string", enum: ["text", "json"], description: "Output format" },
        case: { type: "boolean", description: "Case-sensitive search" },
      },
      required: ["query"],
    },
    annotations: {
      title: "Search with Context",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "get_backlinks",
    description: "List all notes that link to the specified note (incoming links).",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        counts: { type: "boolean", description: "Show link counts" },
        total: { type: "boolean", description: "Show only the total count" },
        format: { type: "string", enum: ["text", "json", "tsv", "csv"], description: "Output format" },
      },
    },
    annotations: {
      title: "Get Backlinks",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "get_links",
    description: "List all outgoing links from the specified note.",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        total: { type: "boolean", description: "Show only the total count" },
      },
    },
    annotations: {
      title: "Get Links",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "find_unresolved_links",
    description: "Find all broken/unresolved links in the vault.",
    inputSchema: {
      type: "object",
      properties: {
        total: { type: "boolean", description: "Show only the total count" },
        counts: { type: "boolean", description: "Show occurrence counts" },
        verbose: { type: "boolean", description: "Show detailed info" },
        format: { type: "string", enum: ["text", "json", "tsv", "csv"], description: "Output format" },
      },
    },
    annotations: {
      title: "Find Unresolved Links",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "find_orphan_notes",
    description: "Find notes with no incoming links (orphans).",
    inputSchema: {
      type: "object",
      properties: {
        total: { type: "boolean", description: "Show only the total count" },
      },
    },
    annotations: {
      title: "Find Orphan Notes",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "get_outline",
    description: "Get the heading structure/outline of a note.",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        format: { type: "string", enum: ["tree", "md", "json"], description: "Output format" },
        total: { type: "boolean", description: "Show only the total count" },
      },
    },
    annotations: {
      title: "Get Outline",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "get_properties",
    description: "List properties (frontmatter) of a note or across the vault.",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        name: { type: "string", description: "Filter by property name" },
        sort: { type: "string", enum: ["count"], description: "Sort order" },
        format: { type: "string", enum: ["yaml", "json", "tsv"], description: "Output format" },
        total: { type: "boolean", description: "Show only the total count" },
        counts: { type: "boolean", description: "Show occurrence counts" },
        active: { type: "boolean", description: "Only active file" },
      },
    },
    annotations: {
      title: "Get Properties",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "read_property",
    description: "Read the value of a specific property from a note.",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        name: { type: "string", description: "Property name to read" },
      },
      required: ["name"],
    },
    annotations: {
      title: "Read Property",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "list_tags",
    description: "List tags used in the vault or a specific note.",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        sort: { type: "string", enum: ["count"], description: "Sort by count" },
        total: { type: "boolean", description: "Show only the total count" },
        counts: { type: "boolean", description: "Show tag counts" },
        format: { type: "string", enum: ["text", "json", "tsv", "csv"], description: "Output format" },
        active: { type: "boolean", description: "Only active file" },
      },
    },
    annotations: {
      title: "List Tags",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "list_tasks",
    description: "List tasks (checkboxes) in the vault or a specific note.",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        daily: { type: "boolean", description: "Search in daily note" },
        status: { type: "string", description: "Filter by status character (e.g. 'x' for done, ' ' for open)" },
        total: { type: "boolean", description: "Show only the total count" },
        done: { type: "boolean", description: "Show only completed tasks" },
        todo: { type: "boolean", description: "Show only incomplete tasks" },
        verbose: { type: "boolean", description: "Show detailed info" },
        format: { type: "string", enum: ["text", "json", "tsv", "csv"], description: "Output format" },
        active: { type: "boolean", description: "Only active file" },
      },
    },
    annotations: {
      title: "List Tasks",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "daily_read",
    description: "Read today's daily note content.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    annotations: {
      title: "Read Daily Note",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "daily_path",
    description: "Get the expected file path for today's daily note.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    annotations: {
      title: "Daily Note Path",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "get_vault_info",
    description: "Get information about the current vault (name, path, file count, size).",
    inputSchema: {
      type: "object",
      properties: {
        info: {
          type: "string",
          enum: ["name", "path", "files", "folders", "size"],
          description: "Specific info to retrieve",
        },
      },
    },
    annotations: {
      title: "Get Vault Info",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "wordcount",
    description: "Count words and/or characters in a note.",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        words: { type: "boolean", description: "Show word count only" },
        characters: { type: "boolean", description: "Show character count only" },
      },
    },
    annotations: {
      title: "Word Count",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "get_help",
    description: "Get help for Obsidian CLI commands. Omit command for the full command list.",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Command to get help for" },
      },
    },
    annotations: {
      title: "Get Help",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];

// ─── Write tools ───────────────────────────────────────────────────

export const writeTools: ToolDefinition[] = [
  {
    name: "create_note",
    description: "Create a new note. Can optionally use a template and set initial content.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Note name" },
        path: { type: "string", description: "Full path from vault root" },
        content: { type: "string", description: "Initial content (use \\n for newlines)" },
        template: { type: "string", description: "Template name to use" },
        overwrite: { type: "boolean", description: "Overwrite if file exists" },
        open: { type: "boolean", description: "Open note after creation" },
        newtab: { type: "boolean", description: "Open in a new tab" },
      },
    },
    annotations: {
      title: "Create Note",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "append_note",
    description: "Append content to the end of a note.",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        content: { type: "string", description: "Content to append (use \\n for newlines)" },
        inline: { type: "boolean", description: "Append inline (no newline before)" },
      },
      required: ["content"],
    },
    annotations: {
      title: "Append to Note",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "prepend_note",
    description: "Prepend content to a note (after frontmatter).",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        content: { type: "string", description: "Content to prepend (use \\n for newlines)" },
        inline: { type: "boolean", description: "Prepend inline (no newline after)" },
      },
      required: ["content"],
    },
    annotations: {
      title: "Prepend to Note",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "set_property",
    description: "Set a frontmatter property on a note.",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        name: { type: "string", description: "Property name" },
        value: { type: "string", description: "Property value" },
        type: {
          type: "string",
          enum: ["text", "list", "number", "checkbox", "date", "datetime"],
          description: "Property type",
        },
      },
      required: ["name", "value"],
    },
    annotations: {
      title: "Set Property",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "daily_create",
    description: "Open/create today's daily note in Obsidian.",
    inputSchema: {
      type: "object",
      properties: {
        paneType: {
          type: "string",
          enum: ["tab", "split", "window"],
          description: "How to open the note",
        },
      },
    },
    annotations: {
      title: "Create Daily Note",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "daily_append",
    description: "Append content to today's daily note.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Content to append (use \\n for newlines)" },
        inline: { type: "boolean", description: "Append inline (no newline before)" },
        paneType: {
          type: "string",
          enum: ["tab", "split", "window"],
          description: "How to open the note",
        },
        open: { type: "boolean", description: "Open note after appending" },
      },
      required: ["content"],
    },
    annotations: {
      title: "Append to Daily Note",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "daily_prepend",
    description: "Prepend content to today's daily note (after frontmatter).",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Content to prepend (use \\n for newlines)" },
        inline: { type: "boolean", description: "Prepend inline (no newline after)" },
        paneType: {
          type: "string",
          enum: ["tab", "split", "window"],
          description: "How to open the note",
        },
        open: { type: "boolean", description: "Open note after prepending" },
      },
      required: ["content"],
    },
    annotations: {
      title: "Prepend to Daily Note",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "update_task",
    description: "Update a task's status (toggle, mark done/todo, or set custom status).",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        daily: { type: "boolean", description: "Target the daily note" },
        ref: { type: "string", description: "Task reference in 'path:line' format" },
        line: { type: "number", description: "Line number of the task" },
        status: { type: "string", description: "Set status character (e.g. 'x', ' ', '/')" },
        toggle: { type: "boolean", description: "Toggle task status" },
        done: { type: "boolean", description: "Mark task as done" },
        todo: { type: "boolean", description: "Mark task as todo" },
      },
    },
    annotations: {
      title: "Update Task",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "add_bookmark",
    description: "Add a bookmark to a file, folder, search, or URL.",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        folder: { type: "string", description: "Folder to bookmark" },
        search: { type: "string", description: "Search query to bookmark" },
        url: { type: "string", description: "URL to bookmark" },
        title: { type: "string", description: "Bookmark title" },
      },
    },
    annotations: {
      title: "Add Bookmark",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
];

// ─── Destructive tools ─────────────────────────────────────────────

export const destructiveTools: ToolDefinition[] = [
  {
    name: "move_note",
    description: "Move or rename a note to a new path. Automatically updates all links.",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        to: { type: "string", description: "Destination path" },
      },
      required: ["to"],
    },
    annotations: {
      title: "Move Note",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "rename_note",
    description: "Rename a note (preserves extension). Updates all links.",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        name: { type: "string", description: "New name (without extension)" },
      },
      required: ["name"],
    },
    annotations: {
      title: "Rename Note",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "delete_note",
    description: "Delete a note. By default moves to trash; use permanent=true to skip trash.",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        permanent: { type: "boolean", description: "Permanently delete (skip trash)" },
      },
    },
    annotations: {
      title: "Delete Note",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "remove_property",
    description: "Remove a frontmatter property from a note.",
    inputSchema: {
      type: "object",
      properties: {
        ...fileOrPath,
        name: { type: "string", description: "Property name to remove" },
      },
      required: ["name"],
    },
    annotations: {
      title: "Remove Property",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "run_command",
    description:
      "Run any Obsidian CLI command directly. Use get_help to discover available commands. " +
      "This is an escape hatch for the ~80 CLI commands not exposed as dedicated tools " +
      "(sync, plugins, themes, templates, workspaces, publish, dev tools, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string", description: "CLI command (e.g. 'sync:status', 'plugins', 'vault')" },
        args: {
          type: "object",
          additionalProperties: { type: "string" },
          description: 'Key-value parameters (e.g. {"id": "my-plugin", "name": "test"})',
        },
        flags: {
          type: "array",
          items: { type: "string" },
          description: 'Boolean flags (e.g. ["verbose", "total"])',
        },
      },
      required: ["command"],
    },
    annotations: {
      title: "Run CLI Command",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
];

// ─── All tools ─────────────────────────────────────────────────────

export const allTools: ToolDefinition[] = [...readOnlyTools, ...writeTools, ...destructiveTools];

// ─── Command mapping ──────────────────────────────────────────────

const commandMap: Record<string, string> = {
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
const booleanFlags = new Set([
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

export async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    let command: string;
    let params: Record<string, unknown>;
    let flags: string[] | undefined;

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

    const result = await runObsidianCli(command, params, flags);

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
