import { beforeEach, describe, expect, it, vi } from "vitest";

import { isObsidianRunning, runObsidianCli } from "../cli.js";
import { getPrompt, listPrompts, prompts } from "../prompts.js";

vi.mock("../cli.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../cli.js")>();
  return {
    ...actual,
    runObsidianCli: vi.fn(),
    isObsidianRunning: vi.fn(() => true),
  };
});

const mockIsRunning = vi.mocked(isObsidianRunning);

const mockRunCli = vi.mocked(runObsidianCli);

describe("listPrompts", () => {
  it("returns all defined prompts", () => {
    const result = listPrompts();
    expect(result.prompts.length).toBe(prompts.length);
    expect(result.prompts.length).toBeGreaterThan(0);
  });

  it("each prompt has name, description, and arguments", () => {
    for (const prompt of prompts) {
      expect(prompt.name).toBeTruthy();
      expect(prompt.description).toBeTruthy();
      expect(Array.isArray(prompt.arguments)).toBe(true);
    }
  });
});

describe("getPrompt", () => {
  beforeEach(() => {
    mockRunCli.mockReset();
    mockRunCli.mockResolvedValue({ stdout: "mock output", stderr: "" });
  });

  it("returns messages for analyze_vault", async () => {
    const result = await getPrompt("analyze_vault", {});
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe("user");
    expect(result.messages[0].content.type).toBe("text");
  });

  it("returns messages for summarize_note", async () => {
    const result = await getPrompt("summarize_note", { file: "test.md" });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content.text).toContain("test.md");
  });

  it("throws when Obsidian is not running", async () => {
    mockIsRunning.mockReturnValue(false);
    await expect(getPrompt("analyze_vault", {})).rejects.toThrow("Obsidian is not running");
    mockIsRunning.mockReturnValue(true);
  });

  it("throws for unknown prompt", async () => {
    await expect(getPrompt("nonexistent", {})).rejects.toThrow("Unknown prompt");
  });

  it("throws when required argument is missing", async () => {
    await expect(getPrompt("summarize_note", {})).rejects.toThrow("Missing required argument");
  });

  it("returns messages for find_related", async () => {
    const result = await getPrompt("find_related", { file: "test.md" });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content.text).toContain("test.md");
  });

  it("returns messages for daily_review", async () => {
    const result = await getPrompt("daily_review", {});
    expect(result.messages).toHaveLength(1);
  });

  it("returns messages for suggest_links", async () => {
    const result = await getPrompt("suggest_links", { file: "ideas.md" });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe("user");
    expect(result.messages[0].content.text).toContain("ideas.md");
    expect(result.messages[0].content.text).toContain("wikilinks");
  });

  it("throws when suggest_links is called without file argument", async () => {
    await expect(getPrompt("suggest_links", {})).rejects.toThrow("Missing required argument");
  });
});
