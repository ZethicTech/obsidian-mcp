import { beforeEach, describe, expect, it, vi } from "vitest";

import { isObsidianRunning, runObsidianCli } from "../cli.js";
import { toolSchemas } from "../schemas.js";
import {
  allTools,
  booleanFlags,
  commandMap,
  destructiveTools,
  handleToolCall,
  readOnlyTools,
  writeTools,
} from "../tools.js";

vi.mock("../cli.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../cli.js")>();
  return {
    ...actual,
    runObsidianCli: vi.fn(),
    isObsidianRunning: vi.fn(() => true),
  };
});

const mockRunCli = vi.mocked(runObsidianCli);
const mockIsRunning = vi.mocked(isObsidianRunning);

describe("tool definitions", () => {
  it("has no duplicate tool names", () => {
    const names = allTools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every tool has required fields", () => {
    for (const tool of allTools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect((tool.inputSchema as Record<string, unknown>).type).toBe("object");
      expect(tool.annotations).toBeDefined();
      expect(tool.annotations.title).toBeTruthy();
      expect(typeof tool.annotations.readOnlyHint).toBe("boolean");
      expect(typeof tool.annotations.destructiveHint).toBe("boolean");
      expect(typeof tool.annotations.idempotentHint).toBe("boolean");
      expect(typeof tool.annotations.openWorldHint).toBe("boolean");
    }
  });

  it("tool names match [a-z_]+ pattern", () => {
    for (const tool of allTools) {
      expect(tool.name).toMatch(/^[a-z_]+$/);
    }
  });

  it("every tool has a commandMap entry (except run_command which has special routing)", () => {
    for (const tool of allTools) {
      if (tool.name === "run_command") continue;
      expect(commandMap[tool.name]).toBeDefined();
    }
  });

  it("every commandMap entry has a tool definition", () => {
    const toolNames = new Set(allTools.map((t) => t.name));
    for (const name of Object.keys(commandMap)) {
      expect(toolNames.has(name)).toBe(true);
    }
  });

  it("every tool has a Zod schema", () => {
    for (const tool of allTools) {
      expect(toolSchemas[tool.name]).toBeDefined();
    }
  });

  it("inputSchema.required fields exist in properties", () => {
    for (const tool of allTools) {
      const schema = tool.inputSchema as { required?: string[]; properties?: Record<string, unknown> };
      if (schema.required) {
        for (const field of schema.required) {
          expect(schema.properties?.[field]).toBeDefined();
        }
      }
    }
  });

  it("readOnlyTools all have readOnlyHint: true", () => {
    for (const tool of readOnlyTools) {
      expect(tool.annotations.readOnlyHint).toBe(true);
    }
  });

  it("destructiveTools all have destructiveHint: true", () => {
    for (const tool of destructiveTools) {
      expect(tool.annotations.destructiveHint).toBe(true);
    }
  });

  it("allTools count equals sum of categories", () => {
    expect(allTools.length).toBe(readOnlyTools.length + writeTools.length + destructiveTools.length);
  });
});

describe("handleToolCall routing", () => {
  beforeEach(() => {
    mockRunCli.mockReset();
    mockRunCli.mockResolvedValue({ stdout: "ok", stderr: "" });
    mockIsRunning.mockReturnValue(true);
  });

  it("returns isError when Obsidian is not running", async () => {
    mockIsRunning.mockReturnValue(false);
    const result = await handleToolCall("read_note", { file: "Test" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Obsidian is not running");
    expect(mockRunCli).not.toHaveBeenCalled();
  });

  it("routes known tool to correct CLI command", async () => {
    await handleToolCall("read_note", { file: "Test" });
    expect(mockRunCli).toHaveBeenCalledWith("read", { file: "Test" }, [], undefined, {});
  });

  it("separates boolean flags from params", async () => {
    await handleToolCall("list_files", { folder: "notes", total: true });
    expect(mockRunCli).toHaveBeenCalledWith("files", { folder: "notes" }, ["total"], undefined, {});
  });

  it("drops false boolean values", async () => {
    await handleToolCall("list_files", { total: false });
    expect(mockRunCli).toHaveBeenCalledWith("files", {}, [], undefined, {});
  });

  it("returns isError for unknown tool", async () => {
    const result = await handleToolCall("nonexistent_tool", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown tool");
  });

  it("passes run_command args through directly", async () => {
    await handleToolCall("run_command", { command: "sync:status", args: { id: "x" }, flags: ["verbose"] });
    expect(mockRunCli).toHaveBeenCalledWith("sync:status", { id: "x" }, ["verbose"], undefined, {});
  });

  it("returns isError when CLI throws", async () => {
    mockRunCli.mockRejectedValue(new Error("CLI failed"));
    const result = await handleToolCall("read_note", { file: "Test" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("CLI failed");
  });

  it("returns isError for stderr-only result", async () => {
    mockRunCli.mockResolvedValue({ stdout: "", stderr: "error msg" });
    const result = await handleToolCall("read_note", { file: "Test" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("error msg");
  });

  it("returns stdout when both stdout and stderr are present", async () => {
    mockRunCli.mockResolvedValue({ stdout: "data", stderr: "warning" });
    const result = await handleToolCall("read_note", { file: "Test" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe("data");
  });
});

describe("Zod validation", () => {
  beforeEach(() => {
    mockRunCli.mockReset();
    mockRunCli.mockResolvedValue({ stdout: "ok", stderr: "" });
  });

  it("accepts valid input", async () => {
    const result = await handleToolCall("search", { query: "hello" });
    expect(result.isError).toBeUndefined();
  });

  it("rejects missing required field", async () => {
    const result = await handleToolCall("search", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid input");
  });

  it("rejects wrong type", async () => {
    const result = await handleToolCall("search", { query: 123 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid input");
  });
});

describe("progress and cancellation", () => {
  beforeEach(() => {
    mockRunCli.mockReset();
    mockRunCli.mockResolvedValue({ stdout: "ok", stderr: "" });
  });

  it("calls onProgress with (0,1) then (1,1) on success", async () => {
    const onProgress = vi.fn();
    await handleToolCall("read_note", { file: "Test" }, { onProgress });
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, 0, 1);
    expect(onProgress).toHaveBeenNthCalledWith(2, 1, 1);
  });

  it("does not call onProgress when not provided", async () => {
    await handleToolCall("read_note", { file: "Test" });
    // No error thrown — onProgress is safely skipped
  });

  it("passes signal through to runObsidianCli", async () => {
    const controller = new AbortController();
    await handleToolCall("read_note", { file: "Test" }, { signal: controller.signal });
    expect(mockRunCli).toHaveBeenCalledWith(
      "read",
      { file: "Test" },
      [],
      undefined,
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});

describe("Zod enum validation", () => {
  beforeEach(() => {
    mockRunCli.mockReset();
    mockRunCli.mockResolvedValue({ stdout: "ok", stderr: "" });
  });

  it("rejects invalid enum value for format field", async () => {
    const result = await handleToolCall("search", { query: "test", format: "xml" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid input");
  });

  it("accepts valid enum value for format field", async () => {
    const result = await handleToolCall("search", { query: "test", format: "json" });
    expect(result.isError).toBeUndefined();
  });
});

describe("booleanFlags set", () => {
  it("contains expected flags", () => {
    const expected = ["total", "counts", "verbose", "done", "todo", "permanent", "overwrite", "toggle"];
    for (const flag of expected) {
      expect(booleanFlags.has(flag)).toBe(true);
    }
  });
});
