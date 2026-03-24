# Obsidian MCP

[![npm](https://img.shields.io/npm/v/@zethictech/obsidian-mcp)](https://www.npmjs.com/package/@zethictech/obsidian-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Access your Obsidian vault from **Claude Desktop**, **Claude Code**, and other AI tools that support the [Model Context Protocol](https://modelcontextprotocol.io/).

Obsidian 1.12 introduced a powerful CLI, but it isn't directly accessible from GUI-based AI tools like Claude Desktop. This MCP server bridges that gap — giving any MCP-compatible client full access to your vault through 34 tools and prompt templates.

**Features:** read/write/search notes, manage properties and tasks, run pre-built prompt workflows — all validated with Zod schemas and powered by the official Obsidian CLI.

## Prerequisites

- **Obsidian 1.12+** with the CLI enabled: Settings → General → Advanced → Command Line Interface → Enable
- **Obsidian app must be running** (the CLI communicates with the app)

---

## Setup

Install the package from npm and configure your MCP client to use it. The server runs locally on your machine and communicates with the Obsidian app via its CLI.

### How it works

```
Your machine
┌─────────────────────────────┐
│ Claude Desktop / Claude Code│
│   ↕ stdio (stdin/stdout)    │
│ obsidian-mcp (Node.js)      │ ──CLI──→  Obsidian App (running)
└─────────────────────────────┘
```

Each user runs the server locally via `npx`. The server receives tool calls from Claude over stdio and executes Obsidian CLI commands against the running app.

### Claude Desktop

Add to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "npx",
      "args": ["-y", "@zethictech/obsidian-mcp"],
      "env": {
        "OBSIDIAN_VAULT": "MyVault"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

### Claude Code

```bash
claude mcp add obsidian npx @zethictech/obsidian-mcp --env OBSIDIAN_VAULT="My Vault"
```

To make it available across all projects, add `--scope global`:

```bash
claude mcp add obsidian npx @zethictech/obsidian-mcp --env OBSIDIAN_VAULT="My Vault" --scope user
```

### Environment Variables

| Variable            | Required | Description                                                   |
| ------------------- | -------- | ------------------------------------------------------------- |
| `OBSIDIAN_VAULT`    | Yes      | Vault name or ID                                              |
| `OBSIDIAN_CLI_PATH` | No       | Override path to `obsidian` binary (auto-detected by default) |
| `OBSIDIAN_TIMEOUT`  | No       | CLI timeout in milliseconds (default: `30000`)                |

---

## Available Tools (34)

### Read-only tools (20)

| Tool                    | Description                          |
| ----------------------- | ------------------------------------ |
| `read_note`             | Read the full content of a note      |
| `get_file_info`         | Get metadata about a file            |
| `list_files`            | List files in the vault              |
| `list_folders`          | List folders in the vault            |
| `search`                | Search the vault for text            |
| `search_with_context`   | Search with surrounding line context |
| `get_backlinks`         | List incoming links to a note        |
| `get_links`             | List outgoing links from a note      |
| `find_unresolved_links` | Find broken/unresolved links         |
| `find_orphan_notes`     | Find notes with no incoming links    |
| `get_outline`           | Get heading structure of a note      |
| `get_properties`        | List frontmatter properties          |
| `read_property`         | Read a specific property value       |
| `list_tags`             | List tags in the vault or a note     |
| `list_tasks`            | List tasks (checkboxes)              |
| `daily_read`            | Read today's daily note              |
| `daily_path`            | Get the daily note file path         |
| `get_vault_info`        | Get vault info (name, path, size)    |
| `wordcount`             | Count words/characters in a note     |
| `get_help`              | Get CLI help for any command         |

### Write tools (9)

| Tool            | Description                      |
| --------------- | -------------------------------- |
| `create_note`   | Create a new note                |
| `append_note`   | Append content to a note         |
| `prepend_note`  | Prepend content to a note        |
| `set_property`  | Set a frontmatter property       |
| `daily_create`  | Open/create today's daily note   |
| `daily_append`  | Append to today's daily note     |
| `daily_prepend` | Prepend to today's daily note    |
| `update_task`   | Toggle or update a task's status |
| `add_bookmark`  | Add a bookmark                   |

### Destructive tools (5)

| Tool              | Description                        |
| ----------------- | ---------------------------------- |
| `move_note`       | Move a note (updates all links)    |
| `rename_note`     | Rename a note (updates all links)  |
| `delete_note`     | Delete a note (trash or permanent) |
| `remove_property` | Remove a frontmatter property      |
| `run_command`     | Run any CLI command directly       |

> **`run_command`** is an escape hatch that gives you access to all ~100 CLI commands not covered by the structured tools above (sync, plugins, themes, templates, workspaces, publish, dev tools, etc.). Use `get_help` to discover available commands.

All tool inputs are validated at runtime using [Zod](https://zod.dev/) schemas. Invalid inputs return clear error messages before any CLI command is executed.

---

## Prompts

Five pre-built [MCP Prompts](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts) provide templated workflows. These gather vault data via CLI calls and return structured messages for the LLM.

| Prompt           | Arguments       | Description                                                 |
| ---------------- | --------------- | ----------------------------------------------------------- |
| `analyze_vault`  | —               | Vault health overview: orphan notes, unresolved links, tags |
| `summarize_note` | `file` required | Read and summarize a specific note                          |
| `find_related`   | `file` required | Find related notes via backlinks, links, and shared tags    |
| `daily_review`   | —               | Review today's daily note and suggest follow-up actions     |
| `suggest_links`  | `file` required | Suggest wikilinks to add based on note content              |

---

## Troubleshooting

**Server not starting?**

- Verify `OBSIDIAN_VAULT` is set and matches your vault name exactly
- Ensure Obsidian 1.12+ is installed with the CLI enabled
- Run `npx @zethictech/obsidian-mcp --version` to verify the package loads

**Obsidian app not detected?**

- The CLI requires Obsidian to be running — start the app and try again
- If Obsidian just launched, wait a few seconds for it to fully initialize

**Stale npx cache?**

```bash
npx --yes @zethictech/obsidian-mcp
```

## License

MIT
