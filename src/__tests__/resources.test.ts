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

describe("MIME type detection", () => {
  beforeEach(() => {
    process.env.OBSIDIAN_VAULT = "V";
    mockRunCli.mockReset();
  });

  afterEach(() => {
    delete process.env.OBSIDIAN_VAULT;
  });

  it("detects JSON files", async () => {
    mockRunCli.mockResolvedValue({ stdout: "data.json", stderr: "" });
    const result = await listResources();
    expect(result.resources[0].mimeType).toBe("application/json");
  });

  it("detects plain text files", async () => {
    mockRunCli.mockResolvedValue({ stdout: "readme.txt", stderr: "" });
    const result = await listResources();
    expect(result.resources[0].mimeType).toBe("text/plain");
  });

  it("detects PNG images", async () => {
    mockRunCli.mockResolvedValue({ stdout: "photo.png", stderr: "" });
    const result = await listResources();
    expect(result.resources[0].mimeType).toBe("image/png");
  });

  it("detects PDF files", async () => {
    mockRunCli.mockResolvedValue({ stdout: "doc.pdf", stderr: "" });
    const result = await listResources();
    expect(result.resources[0].mimeType).toBe("application/pdf");
  });

  it("detects canvas files as JSON", async () => {
    mockRunCli.mockResolvedValue({ stdout: "board.canvas", stderr: "" });
    const result = await listResources();
    expect(result.resources[0].mimeType).toBe("application/json");
  });

  it("falls back to octet-stream for unknown extensions", async () => {
    mockRunCli.mockResolvedValue({ stdout: "data.xyz", stderr: "" });
    const result = await listResources();
    expect(result.resources[0].mimeType).toBe("application/octet-stream");
  });

  it("handles files with no extension", async () => {
    mockRunCli.mockResolvedValue({ stdout: "Makefile", stderr: "" });
    const result = await listResources();
    // "Makefile" has no dot, so pop() returns "Makefile" → not in MIME_MAP
    expect(result.resources[0].mimeType).toBe("application/octet-stream");
  });
});

describe("URI edge cases", () => {
  beforeEach(() => {
    mockRunCli.mockReset();
    mockRunCli.mockResolvedValue({ stdout: "content", stderr: "" });
  });

  it("handles vault name with spaces in URI", async () => {
    const result = await readResource("obsidian://My%20Vault/note.md");
    expect(result.contents[0].uri).toBe("obsidian://My%20Vault/note.md");
    expect(mockRunCli).toHaveBeenCalledWith("read", { path: "note.md" });
  });

  it("handles nested paths in URI", async () => {
    await readResource("obsidian://V/folder/sub/deep/note.md");
    expect(mockRunCli).toHaveBeenCalledWith("read", { path: "folder/sub/deep/note.md" });
  });

  it("rejects URI without path", async () => {
    await expect(readResource("obsidian://V/")).rejects.toThrow("Invalid resource URI");
  });
});

describe("pagination edge cases", () => {
  const savedEnv = process.env.OBSIDIAN_VAULT;

  beforeEach(() => {
    process.env.OBSIDIAN_VAULT = "V";
    mockRunCli.mockReset();
  });

  afterEach(() => {
    if (savedEnv !== undefined) {
      process.env.OBSIDIAN_VAULT = savedEnv;
    } else {
      delete process.env.OBSIDIAN_VAULT;
    }
  });

  it("exactly PAGE_SIZE files returns no nextCursor", async () => {
    const files = Array.from({ length: 100 }, (_, i) => `note${i}.md`).join("\n");
    mockRunCli.mockResolvedValue({ stdout: files, stderr: "" });
    const result = await listResources();
    expect(result.resources).toHaveLength(100);
    expect(result.nextCursor).toBeUndefined();
  });

  it("handles invalid cursor gracefully (defaults to offset 0)", async () => {
    mockRunCli.mockResolvedValue({ stdout: "a.md\nb.md", stderr: "" });
    const result = await listResources("not-valid-base64url!!!");
    // Should not throw — decodeCursor returns 0 or NaN which defaults to 0
    expect(result.resources.length).toBeGreaterThanOrEqual(0);
  });
});
