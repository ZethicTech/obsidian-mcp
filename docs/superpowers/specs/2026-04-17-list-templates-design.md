# list_templates Tool Design

## Summary

Add a `list_templates` read-only tool that discovers and lists available templates in a user's Obsidian vault by auto-detecting the template folder from vault configuration.

## Problem

The `create_note` tool already accepts a `template` parameter, but users have no way to discover what templates are available. They must already know the template name, which breaks discoverability.

## Design

### Tool: `list_templates`

**Category**: Read-only
**CLI command**: Composite (no single CLI command for this)

#### How It Works

1. **Get vault filesystem path** -- run `obsidian vault info=path` to resolve the vault's location on disk.
2. **Detect template folder** -- read config files from `.obsidian/` inside the vault:
   - **Core Templates plugin**: read `.obsidian/templates.json`, extract `folder` key.
   - **Templater plugin**: read `.obsidian/plugins/templater-obsidian/data.json`, extract `templates_folder` key.
   - Priority: if both are configured, return templates from both sources (deduplicated), noting which plugin configured them.
3. **List template files** -- run `obsidian files folder=<template_folder>` to list `.md` files in the resolved folder.
4. **Return results** -- template names (without `.md` extension, matching what `create_note template=` expects).

#### Input Schema

```typescript
z.object({
  folder: z.string().optional().describe("Override template folder path (relative to vault root)"),
});
```

The `folder` param is an optional override for users whose template folder can't be auto-detected. No env vars needed.

#### Output

Returns a text list of template names, one per line. Example:

```
Templates found (source: Core Templates, folder: "Templates"):
- Meeting Notes
- Project Brief
- Weekly Review
```

If both Core Templates and Templater are configured with different folders:

```
Templates found:

Core Templates (folder: "Templates"):
- Meeting Notes
- Weekly Review

Templater (folder: "Templater"):
- Daily Journal
- Project Kickoff
```

#### Error Cases

| Condition                            | Response                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Vault path can't be resolved         | Error: "Could not determine vault path."                                                                                                    |
| No template plugin configured        | Error: "No template folder configured. Set a template folder in Obsidian Settings > Core Plugins > Templates, or pass folder= to override." |
| Template folder is empty             | Success with message: "No templates found in folder 'X'."                                                                                   |
| `.obsidian/` config files unreadable | Falls back to `folder` param if provided, otherwise errors with guidance.                                                                   |

### Implementation Scope

Files to modify:

- `src/schemas.ts` -- add `listTemplatesSchema`
- `src/tools.ts` -- add `list_templates` to `toolMeta`, `readOnlyToolNames`, and `commandMap`
- `src/cli.ts` -- add helper function `getVaultPath()` and `detectTemplateFolders()` that reads config files
- `src/tools.ts` -- custom handler in `handleToolCall` for `list_templates` (since it's a composite operation, not a single CLI command)

### What This Does NOT Include

- No new env vars
- No `create_from_template` tool (redundant with `create_note template=`)
- No template content reading (users can use `read_note` for that)
- No template editing or creation tools
