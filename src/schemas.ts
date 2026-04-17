import { z } from "zod";

// ─── Reusable fragments ───────────────────────────────────────────

const fileOrPath = {
  file: z.string().optional().describe("Note name (wikilink-style resolution)"),
  path: z.string().optional().describe("Exact path from vault root"),
};

const formatTextJson = z.enum(["text", "json"]).optional().describe("Output format");
const formatFull = z.enum(["text", "json", "tsv", "csv"]).optional().describe("Output format");
const totalFlag = z.boolean().optional().describe("Show only the total count");
const countsFlag = z.boolean().optional().describe("Show occurrence counts");

// ─── Read-only tool schemas ───────────────────────────────────────

export const readNoteSchema = z.object({ ...fileOrPath });

export const getFileInfoSchema = z.object({ ...fileOrPath });

export const listFilesSchema = z.object({
  folder: z.string().optional().describe("Limit to folder"),
  ext: z.string().optional().describe("Filter by extension (e.g. 'md')"),
  total: totalFlag,
});

export const listFoldersSchema = z.object({
  folder: z.string().optional().describe("Limit to parent folder"),
  total: totalFlag,
});

const searchBase = z.object({
  query: z.string().describe("Search query"),
  path: z.string().optional().describe("Limit to path"),
  limit: z.number().optional().describe("Max results"),
  format: formatTextJson,
  case: z.boolean().optional().describe("Case-sensitive search"),
});

export const searchSchema = searchBase.extend({ total: totalFlag });

export const searchWithContextSchema = searchBase;

export const getBacklinksSchema = z.object({
  ...fileOrPath,
  counts: countsFlag,
  total: totalFlag,
  format: formatFull,
});

export const getLinksSchema = z.object({
  ...fileOrPath,
  total: totalFlag,
});

export const findUnresolvedLinksSchema = z.object({
  total: totalFlag,
  counts: countsFlag,
  verbose: z.boolean().optional().describe("Show detailed info"),
  format: formatFull,
});

export const findOrphanNotesSchema = z.object({
  total: totalFlag,
});

export const getOutlineSchema = z.object({
  ...fileOrPath,
  format: z.enum(["tree", "md", "json"]).optional().describe("Output format"),
  total: totalFlag,
});

export const getPropertiesSchema = z.object({
  ...fileOrPath,
  name: z.string().optional().describe("Filter by property name"),
  sort: z.enum(["count"]).optional().describe("Sort order"),
  format: z.enum(["yaml", "json", "tsv"]).optional().describe("Output format"),
  total: totalFlag,
  counts: countsFlag,
  active: z.boolean().optional().describe("Only active file"),
});

export const readPropertySchema = z.object({
  ...fileOrPath,
  name: z.string().describe("Property name to read"),
});

export const listTagsSchema = z.object({
  ...fileOrPath,
  sort: z.enum(["count"]).optional().describe("Sort by count"),
  total: totalFlag,
  counts: z.boolean().optional().describe("Show tag counts"),
  format: formatFull,
  active: z.boolean().optional().describe("Only active file"),
});

export const listTasksSchema = z.object({
  ...fileOrPath,
  daily: z.boolean().optional().describe("Search in daily note"),
  status: z.string().optional().describe("Filter by status character (e.g. 'x' for done, ' ' for open)"),
  total: totalFlag,
  done: z.boolean().optional().describe("Show only completed tasks"),
  todo: z.boolean().optional().describe("Show only incomplete tasks"),
  verbose: z.boolean().optional().describe("Show detailed info"),
  format: formatFull,
  active: z.boolean().optional().describe("Only active file"),
});

export const dailyReadSchema = z.object({});

export const dailyPathSchema = z.object({});

export const getVaultInfoSchema = z.object({
  info: z.enum(["name", "path", "files", "folders", "size"]).optional().describe("Specific info to retrieve"),
});

export const wordcountSchema = z.object({
  ...fileOrPath,
  words: z.boolean().optional().describe("Show word count only"),
  characters: z.boolean().optional().describe("Show character count only"),
});

export const getHelpSchema = z.object({
  command: z.string().optional().describe("Command to get help for"),
});

export const listTemplatesSchema = z.object({
  folder: z.string().optional().describe("Override template folder path (relative to vault root)"),
});

// ─── Write tool schemas ───────────────────────────────────────────

export const createNoteSchema = z.object({
  name: z.string().optional().describe("Note name"),
  path: z.string().optional().describe("Full path from vault root"),
  content: z.string().optional().describe("Initial content (use \\n for newlines)"),
  template: z.string().optional().describe("Template name to use"),
  overwrite: z.boolean().optional().describe("Overwrite if file exists"),
  open: z.boolean().optional().describe("Open note after creation"),
  newtab: z.boolean().optional().describe("Open in a new tab"),
});

export const appendNoteSchema = z.object({
  ...fileOrPath,
  content: z.string().describe("Content to append (use \\n for newlines)"),
  inline: z.boolean().optional().describe("Append inline (no newline before)"),
});

export const prependNoteSchema = z.object({
  ...fileOrPath,
  content: z.string().describe("Content to prepend (use \\n for newlines)"),
  inline: z.boolean().optional().describe("Prepend inline (no newline after)"),
});

export const setPropertySchema = z.object({
  ...fileOrPath,
  name: z.string().describe("Property name"),
  value: z.string().describe("Property value"),
  type: z.enum(["text", "list", "number", "checkbox", "date", "datetime"]).optional().describe("Property type"),
});

export const dailyCreateSchema = z.object({
  paneType: z.enum(["tab", "split", "window"]).optional().describe("How to open the note"),
});

export const dailyAppendSchema = z.object({
  content: z.string().describe("Content to append (use \\n for newlines)"),
  inline: z.boolean().optional().describe("Append inline (no newline before)"),
  paneType: z.enum(["tab", "split", "window"]).optional().describe("How to open the note"),
  open: z.boolean().optional().describe("Open note after appending"),
});

export const dailyPrependSchema = z.object({
  content: z.string().describe("Content to prepend (use \\n for newlines)"),
  inline: z.boolean().optional().describe("Prepend inline (no newline after)"),
  paneType: z.enum(["tab", "split", "window"]).optional().describe("How to open the note"),
  open: z.boolean().optional().describe("Open note after prepending"),
});

export const updateTaskSchema = z.object({
  ...fileOrPath,
  daily: z.boolean().optional().describe("Target the daily note"),
  ref: z.string().optional().describe("Task reference in 'path:line' format"),
  line: z.number().optional().describe("Line number of the task"),
  status: z.string().optional().describe("Set status character (e.g. 'x', ' ', '/')"),
  toggle: z.boolean().optional().describe("Toggle task status"),
  done: z.boolean().optional().describe("Mark task as done"),
  todo: z.boolean().optional().describe("Mark task as todo"),
});

export const addBookmarkSchema = z.object({
  ...fileOrPath,
  folder: z.string().optional().describe("Folder to bookmark"),
  search: z.string().optional().describe("Search query to bookmark"),
  url: z.string().optional().describe("URL to bookmark"),
  title: z.string().optional().describe("Bookmark title"),
});

// ─── Destructive tool schemas ─────────────────────────────────────

export const moveNoteSchema = z.object({
  ...fileOrPath,
  to: z.string().describe("Destination path"),
});

export const renameNoteSchema = z.object({
  ...fileOrPath,
  name: z.string().describe("New name (without extension)"),
});

export const deleteNoteSchema = z.object({
  ...fileOrPath,
  permanent: z.boolean().optional().describe("Permanently delete (skip trash)"),
});

export const removePropertySchema = z.object({
  ...fileOrPath,
  name: z.string().describe("Property name to remove"),
});

export const runCommandSchema = z
  .object({
    command: z.string().describe("CLI command (e.g. 'sync:status', 'plugins', 'vault')"),
    args: z
      .record(z.string(), z.string())
      .optional()
      .describe('Key-value parameters (e.g. {"id": "my-plugin", "name": "test"})'),
    flags: z.array(z.string()).optional().describe('Boolean flags (e.g. ["verbose", "total"])'),
  })
  .passthrough();

// ─── Schema map ───────────────────────────────────────────────────

export const toolSchemas: Record<string, z.ZodType> = {
  read_note: readNoteSchema,
  get_file_info: getFileInfoSchema,
  list_files: listFilesSchema,
  list_folders: listFoldersSchema,
  search: searchSchema,
  search_with_context: searchWithContextSchema,
  get_backlinks: getBacklinksSchema,
  get_links: getLinksSchema,
  find_unresolved_links: findUnresolvedLinksSchema,
  find_orphan_notes: findOrphanNotesSchema,
  get_outline: getOutlineSchema,
  get_properties: getPropertiesSchema,
  read_property: readPropertySchema,
  list_tags: listTagsSchema,
  list_tasks: listTasksSchema,
  daily_read: dailyReadSchema,
  daily_path: dailyPathSchema,
  get_vault_info: getVaultInfoSchema,
  wordcount: wordcountSchema,
  get_help: getHelpSchema,
  list_templates: listTemplatesSchema,
  create_note: createNoteSchema,
  append_note: appendNoteSchema,
  prepend_note: prependNoteSchema,
  set_property: setPropertySchema,
  daily_create: dailyCreateSchema,
  daily_append: dailyAppendSchema,
  daily_prepend: dailyPrependSchema,
  update_task: updateTaskSchema,
  add_bookmark: addBookmarkSchema,
  move_note: moveNoteSchema,
  rename_note: renameNoteSchema,
  delete_note: deleteNoteSchema,
  remove_property: removePropertySchema,
  run_command: runCommandSchema,
};
