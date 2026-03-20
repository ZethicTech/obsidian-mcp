import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { buildArgs } from "../cli.js";
import { handleToolCall } from "../tools.js";

vi.mock("../cli.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../cli.js")>();
  return {
    ...actual,
    runObsidianCli: vi.fn().mockResolvedValue({ stdout: "ok", stderr: "" }),
    isObsidianRunning: vi.fn(() => true),
  };
});

describe("argument injection via buildArgs", () => {
  it("shell command substitution in param value produces literal string", () => {
    const args = buildArgs("read", { file: "$(rm -rf /)" }, undefined, "V");
    expect(args).toContain("file=$(rm -rf /)");
    expect(args.every((a) => typeof a === "string")).toBe(true);
  });

  it("semicolons in param value produce single arg element", () => {
    const args = buildArgs("read", { file: "note; rm -rf /" }, undefined, "V");
    expect(args).toContain("file=note; rm -rf /");
  });

  it("backticks in param value produce literal string", () => {
    const args = buildArgs("read", { file: "`whoami`" }, undefined, "V");
    expect(args).toContain("file=`whoami`");
  });

  it("pipe characters in param value produce literal string", () => {
    const args = buildArgs("read", { file: "note | cat /etc/passwd" }, undefined, "V");
    expect(args).toContain("file=note | cat /etc/passwd");
  });

  it("newlines in param value produce literal string", () => {
    const args = buildArgs("read", { file: "note\nmalicious" }, undefined, "V");
    expect(args).toContain("file=note\nmalicious");
  });

  it("vault with special chars is single array element", () => {
    const args = buildArgs("read", {}, undefined, "My Vault$(evil)");
    expect(args[0]).toBe("vault=My Vault$(evil)");
  });

  it("result is always a string array", () => {
    const maliciousInputs = [
      { file: "$(rm -rf /)" },
      { file: "`whoami`" },
      { file: "'; DROP TABLE notes; --" },
      { file: "note\x00extra" },
    ];
    for (const params of maliciousInputs) {
      const args = buildArgs("read", params, undefined, "V");
      expect(Array.isArray(args)).toBe(true);
      expect(args.every((a) => typeof a === "string")).toBe(true);
    }
  });
});

describe("prototype pollution via handleToolCall", () => {
  it("__proto__ key does not pollute Object.prototype", async () => {
    await handleToolCall("read_note", { file: "test", __proto__: { admin: true } });
    expect(({} as Record<string, unknown>).admin).toBeUndefined();
  });

  it("constructor key does not crash", async () => {
    const result = await handleToolCall("read_note", { constructor: "evil" });
    // Should not throw — either validates or passes through safely
    expect(result).toBeDefined();
  });

  it("prototype key does not crash", async () => {
    const result = await handleToolCall("read_note", { prototype: "evil" });
    expect(result).toBeDefined();
  });
});

describe("unknown/malicious tool names", () => {
  it("empty string returns isError", async () => {
    const result = await handleToolCall("", {});
    expect(result.isError).toBe(true);
  });

  it("path traversal string returns isError", async () => {
    const result = await handleToolCall("../../../etc/passwd", {});
    expect(result.isError).toBe(true);
  });

  it("tool name with spaces returns isError", async () => {
    const result = await handleToolCall("read note", {});
    expect(result.isError).toBe(true);
  });
});

describe("execFile usage verification", () => {
  it("cli.ts imports execFile, not exec", () => {
    const cliPath = resolve(fileURLToPath(import.meta.url), "../../cli.ts");
    const source = readFileSync(cliPath, "utf8");

    // Should import execFile
    expect(source).toMatch(/import\s*\{[^}]*execFile[^}]*\}\s*from\s*["']node:child_process["']/);

    // Should NOT have a standalone exec import (exec without File suffix)
    // Allow execFile and execFileSync, but not bare exec(
    const lines = source.split("\n");
    for (const line of lines) {
      if (line.includes("exec(") && !line.includes("execFile") && !line.includes("execFileSync")) {
        throw new Error(`Found bare exec() call in cli.ts: ${line.trim()}`);
      }
    }
  });
});
