# obsidian-mcp

MCP server for [Obsidian](https://obsidian.md), wrapping the official CLI (1.12+). Use it with Claude Desktop, Claude Code, or any MCP-compatible client to read, write, search, and manage your Obsidian vault.

## Prerequisites

- **Obsidian 1.12+** with the CLI enabled: Settings → General → CLI → Register
- **Obsidian app must be running** (the CLI communicates with the app)
- **Node.js 18+**

## Setup

### Claude Code

```bash
claude mcp add obsidian -e OBSIDIAN_VAULT=MyVault -- npx obsidian-mcp
```

Or if installed locally:

```bash
claude mcp add obsidian -e OBSIDIAN_VAULT=MyVault -- node /path/to/obsidian-mcp/dist/index.js
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "npx",
      "args": ["obsidian-mcp"],
      "env": {
        "OBSIDIAN_VAULT": "MyVault"
      }
    }
  }
}
```

## Configuration

| Environment Variable | Required | Default | Description |
|---------------------|----------|---------|-------------|
| `OBSIDIAN_VAULT` | Yes | — | Vault name or ID |
| `OBSIDIAN_CLI_PATH` | No | Auto-detect | Override path to `obsidian` binary |
| `OBSIDIAN_TIMEOUT` | No | `30000` | CLI timeout in milliseconds |

## Tools

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

## File targeting

Most tools accept two ways to target a file:

- **`file`** — Wikilink-style name resolution (e.g., `"My Note"`)
- **`path`** — Exact path from vault root (e.g., `"folder/My Note.md"`)

## Platform notes

- **macOS**: CLI is added to PATH via `~/.zprofile`. Other shells need manual PATH config.
- **Windows**: Uses `Obsidian.com` terminal redirector. Set `OBSIDIAN_CLI_PATH` if needed.
- **Linux**: CLI is symlinked at `/usr/local/bin/obsidian` (or `~/.local/bin/obsidian`).

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Obsidian CLI not found" | Ensure Obsidian 1.12+ is installed and CLI is enabled in Settings → General → CLI |
| "Timed out" | Make sure the Obsidian app is running |
| Wrong vault | Check `OBSIDIAN_VAULT` matches your vault name exactly |
| Windows issues | Set `OBSIDIAN_CLI_PATH=Obsidian.com` or the full path to the redirector |

## License

MIT
