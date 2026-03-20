import { NOT_RUNNING_MESSAGE, assertCliSuccess, isObsidianRunning, runObsidianCli } from "./cli.js";

// ─── Prompt definitions ──────────────────────────────────────────

interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

interface PromptDefinition {
  name: string;
  description: string;
  arguments: PromptArgument[];
}

interface PromptMessage {
  role: "user" | "assistant";
  content: { type: "text"; text: string };
}

export const prompts: PromptDefinition[] = [
  {
    name: "analyze_vault",
    description: "Generate a vault health overview including orphan notes, unresolved links, and tag distribution.",
    arguments: [],
  },
  {
    name: "summarize_note",
    description: "Read a note and ask the LLM to summarize its content.",
    arguments: [{ name: "file", description: "Note name or path to summarize", required: true }],
  },
  {
    name: "find_related",
    description: "Find notes related to a given note via backlinks, outgoing links, and shared tags.",
    arguments: [{ name: "file", description: "Note name or path to find relations for", required: true }],
  },
  {
    name: "daily_review",
    description: "Review today's daily note and suggest follow-up actions.",
    arguments: [],
  },
  {
    name: "suggest_links",
    description: "Read a note and suggest wikilinks that could be added based on its content.",
    arguments: [{ name: "file", description: "Note name or path to analyze for link suggestions", required: true }],
  },
];

// ─── Prompt handlers ─────────────────────────────────────────────

export function listPrompts(): { prompts: PromptDefinition[] } {
  return { prompts };
}

export async function getPrompt(name: string, args: Record<string, string>): Promise<{ messages: PromptMessage[] }> {
  if (!isObsidianRunning()) {
    throw new Error(NOT_RUNNING_MESSAGE);
  }

  switch (name) {
    case "analyze_vault":
      return analyzeVault();
    case "summarize_note":
      return summarizeNote(args.file);
    case "find_related":
      return findRelated(args.file);
    case "daily_review":
      return dailyReview();
    case "suggest_links":
      return suggestLinks(args.file);
    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}

// ─── Prompt implementations ──────────────────────────────────────

async function analyzeVault(): Promise<{ messages: PromptMessage[] }> {
  const [orphans, unresolved, tags, vaultInfo] = await Promise.all([
    runObsidianCli("orphans", {}, ["total"]),
    runObsidianCli("unresolved", {}, ["total", "counts"]),
    runObsidianCli("tags", {}, ["counts"]),
    runObsidianCli("vault", {}),
  ]);

  const context = [
    "## Vault Info",
    vaultInfo.stdout || "Unable to retrieve vault info.",
    "",
    "## Orphan Notes (no incoming links)",
    orphans.stdout || "None found.",
    "",
    "## Unresolved Links (broken references)",
    unresolved.stdout || "None found.",
    "",
    "## Tags",
    tags.stdout || "No tags found.",
  ].join("\n");

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Analyze the health of this Obsidian vault and provide actionable recommendations.\n\n${context}`,
        },
      },
    ],
  };
}

async function summarizeNote(file: string): Promise<{ messages: PromptMessage[] }> {
  if (!file) throw new Error("Missing required argument: file");

  const result = await runObsidianCli("read", { file });
  assertCliSuccess(result);

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Summarize the following Obsidian note. Highlight key points, action items, and connections to other topics.\n\n# ${file}\n\n${result.stdout}`,
        },
      },
    ],
  };
}

async function findRelated(file: string): Promise<{ messages: PromptMessage[] }> {
  if (!file) throw new Error("Missing required argument: file");

  const [backlinks, links, tags] = await Promise.all([
    runObsidianCli("backlinks", { file }),
    runObsidianCli("links", { file }),
    runObsidianCli("tags", { file }),
  ]);

  const context = [
    `## Backlinks (notes linking to "${file}")`,
    backlinks.stdout || "None.",
    "",
    `## Outgoing links from "${file}"`,
    links.stdout || "None.",
    "",
    `## Tags in "${file}"`,
    tags.stdout || "None.",
  ].join("\n");

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Based on the following link and tag data, identify notes most related to "${file}" and explain the connections.\n\n${context}`,
        },
      },
    ],
  };
}

async function dailyReview(): Promise<{ messages: PromptMessage[] }> {
  const [daily, tasks] = await Promise.all([
    runObsidianCli("daily:read", {}),
    runObsidianCli("tasks", {}, ["daily", "todo"]),
  ]);

  const context = [
    "## Today's Daily Note",
    daily.stdout || "No daily note found for today.",
    "",
    "## Open Tasks in Daily Note",
    tasks.stdout || "No open tasks.",
  ].join("\n");

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Review today's daily note and open tasks. Suggest follow-up actions, priorities, and any items that may need attention.\n\n${context}`,
        },
      },
    ],
  };
}

async function suggestLinks(file: string): Promise<{ messages: PromptMessage[] }> {
  if (!file) throw new Error("Missing required argument: file");

  const [note, existingLinks] = await Promise.all([
    runObsidianCli("read", { file }),
    runObsidianCli("links", { file }),
  ]);

  assertCliSuccess(note);

  const context = [
    `## Content of "${file}"`,
    note.stdout,
    "",
    `## Existing outgoing links`,
    existingLinks.stdout || "None.",
  ].join("\n");

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Analyze this note and suggest wikilinks ([[note name]]) that could be added to connect it with other topics in the vault. Only suggest links for concepts that likely have their own notes.\n\n${context}`,
        },
      },
    ],
  };
}
