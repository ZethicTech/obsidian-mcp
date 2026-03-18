# Obsidian MCP

Connect Claude to your Obsidian vault to read, write, search, and manage notes — directly from Claude.

## Prerequisites

- **Obsidian 1.12+** with the CLI enabled: Settings → General → CLI → Register
- **Obsidian app must be running** (the CLI communicates with the app)

---

## Setup

Install the package from npm and configure Claude Desktop or Claude Code to use it. The MCP server runs locally on your machine and communicates with the Obsidian app via its CLI.

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
claude mcp add obsidian \
  --command npx \
  --args "@zethictech/obsidian-mcp" \
  --env OBSIDIAN_VAULT=MyVault
```

### Environment Variables

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `OBSIDIAN_VAULT` | Yes | Vault name or ID |
| `OBSIDIAN_CLI_PATH` | No | Override path to `obsidian` binary (auto-detected by default) |
| `OBSIDIAN_TIMEOUT` | No | CLI timeout in milliseconds (default: `30000`) |

---

## Available Tools (34)

### Read-only tools (20)

| Tool | Description |
|------|-------------|
| `read_note` | Read the full content of a note |
| `get_file_info` | Get metadata about a file |
| `list_files` | List files in the vault |
| `list_folders` | List folders in the vault |
| `search` | Search the vault for text |
| `search_with_context` | Search with surrounding line context |
| `get_backlinks` | List incoming links to a note |
| `get_links` | List outgoing links from a note |
| `find_unresolved_links` | Find broken/unresolved links |
| `find_orphan_notes` | Find notes with no incoming links |
| `get_outline` | Get heading structure of a note |
| `get_properties` | List frontmatter properties |
| `read_property` | Read a specific property value |
| `list_tags` | List tags in the vault or a note |
| `list_tasks` | List tasks (checkboxes) |
| `daily_read` | Read today's daily note |
| `daily_path` | Get the daily note file path |
| `get_vault_info` | Get vault info (name, path, size) |
| `wordcount` | Count words/characters in a note |
| `get_help` | Get CLI help for any command |

### Write tools (9)

| Tool | Description |
|------|-------------|
| `create_note` | Create a new note |
| `append_note` | Append content to a note |
| `prepend_note` | Prepend content to a note |
| `set_property` | Set a frontmatter property |
| `daily_create` | Open/create today's daily note |
| `daily_append` | Append to today's daily note |
| `daily_prepend` | Prepend to today's daily note |
| `update_task` | Toggle or update a task's status |
| `add_bookmark` | Add a bookmark |

### Destructive tools (5)

| Tool | Description |
|------|-------------|
| `move_note` | Move a note (updates all links) |
| `rename_note` | Rename a note (updates all links) |
| `delete_note` | Delete a note (trash or permanent) |
| `remove_property` | Remove a frontmatter property |
| `run_command` | Run any CLI command directly |

> **`run_command`** is an escape hatch that gives you access to all ~100 CLI commands not covered by the structured tools above (sync, plugins, themes, templates, workspaces, publish, dev tools, etc.). Use `get_help` to discover available commands.

---

## License

MIT
