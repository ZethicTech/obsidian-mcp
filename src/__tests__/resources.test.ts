import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runObsidianCli } from "../cli.js";
import { listResourceTemplates, listResources, readResource } from "../resources.js";

vi.mock("../cli.js", () => ({
  runObsidianCli: vi.fn(),
}));

const mockRunCli = vi.mocked(runObsidianCli);

describe("listResources", () => {
  const savedEnv = process.env.OBSIDIAN_VAULT;

  beforeEach(() => {
    process.env.OBSIDIAN_VAULT = "TestVault";
    mockRunCli.mockReset();
  });

  afterEach(() => {
    if (savedEnv !== undefined) {
      process.env.OBSIDIAN_VAULT = savedEnv;
    } else {
      delete process.env.OBSIDIAN_VAULT;
    }
  });

  it("returns resources with URIs", async () => {
    mockRunCli.mockResolvedValue({ stdout: "notes/hello.md\nnotes/world.md", stderr: "" });
    const result = await listResources();
    expect(result.resources).toHaveLength(2);
    expect(result.resources[0].uri).toBe("obsidian://TestVault/notes/hello.md");
    expect(result.resources[0].name).toBe("notes/hello.md");
    expect(result.resources[0].mimeType).toBe("text/markdown");
  });

  it("handles empty vault", async () => {
    mockRunCli.mockResolvedValue({ stdout: "", stderr: "" });
    const result = await listResources();
    expect(result.resources).toHaveLength(0);
  });

  it("paginates results", async () => {
    const files = Array.from({ length: 150 }, (_, i) => `note${i}.md`).join("\n");
    mockRunCli.mockResolvedValue({ stdout: files, stderr: "" });

    const page1 = await listResources();
    expect(page1.resources).toHaveLength(100);
    expect(page1.nextCursor).toBeDefined();

    const page2 = await listResources(page1.nextCursor);
    expect(page2.resources).toHaveLength(50);
    expect(page2.nextCursor).toBeUndefined();
  });
});

describe("readResource", () => {
  beforeEach(() => {
    mockRunCli.mockReset();
  });

  it("reads a resource by URI", async () => {
    mockRunCli.mockResolvedValue({ stdout: "# Hello World", stderr: "" });
    const result = await readResource("obsidian://TestVault/notes/hello.md");
    expect(result.contents[0].text).toBe("# Hello World");
    expect(result.contents[0].mimeType).toBe("text/markdown");
    expect(mockRunCli).toHaveBeenCalledWith("read", { path: "notes/hello.md" });
  });

  it("throws on invalid URI", async () => {
    await expect(readResource("invalid://uri")).rejects.toThrow("Invalid resource URI");
  });

  it("throws on CLI error", async () => {
    mockRunCli.mockResolvedValue({ stdout: "", stderr: "File not found" });
    await expect(readResource("obsidian://V/missing.md")).rejects.toThrow("File not found");
  });
});

describe("listResourceTemplates", () => {
  const savedEnv = process.env.OBSIDIAN_VAULT;

  beforeEach(() => {
    process.env.OBSIDIAN_VAULT = "TestVault";
  });

  afterEach(() => {
    if (savedEnv !== undefined) {
      process.env.OBSIDIAN_VAULT = savedEnv;
    } else {
      delete process.env.OBSIDIAN_VAULT;
    }
  });

  it("returns resource templates", () => {
    const result = listResourceTemplates();
    expect(result.resourceTemplates).toHaveLength(1);
    expect(result.resourceTemplates[0].uriTemplate).toContain("{path}");
    expect(result.resourceTemplates[0].name).toBeTruthy();
  });
});
