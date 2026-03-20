import { execFile } from "node:child_process";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildArgs } from "../cli.js";

type ExecFileCallback = (error: Error | null, stdout: string | null, stderr: string | null) => void;

// ─── buildArgs (pure, no mocking) ─────────────────────────────────

describe("buildArgs", () => {
  it("prepends vault as first arg", () => {
    const args = buildArgs("read", { file: "Note" }, undefined, "MyVault");
    expect(args[0]).toBe("vault=MyVault");
    expect(args[1]).toBe("read");
  });

  it("passes key=value params", () => {
    const args = buildArgs("search", { query: "hello", limit: 10 }, undefined, "V");
    expect(args).toContain("query=hello");
    expect(args).toContain("limit=10");
  });

  it("appends flags as bare words", () => {
    const args = buildArgs("files", undefined, ["total", "verbose"], "V");
    expect(args).toContain("total");
    expect(args).toContain("verbose");
  });

  it("skips undefined/null/false params", () => {
    const args = buildArgs("read", { file: "Note", path: undefined, x: null, y: false }, undefined, "V");
    expect(args).toEqual(["vault=V", "read", "file=Note"]);
  });

  it("works without vault", () => {
    const args = buildArgs("help", undefined, undefined, undefined);
    expect(args).toEqual(["help"]);
  });

  it("emits empty params object without extra args", () => {
    const args = buildArgs("files", {}, undefined, "V");
    expect(args).toEqual(["vault=V", "files"]);
  });

  it("emits empty flags array without extra args", () => {
    const args = buildArgs("files", undefined, [], "V");
    expect(args).toEqual(["vault=V", "files"]);
  });

  it("moves boolean true params to flags", () => {
    const args = buildArgs("tasks", { done: true }, undefined, "V");
    expect(args).toContain("done");
    expect(args).not.toContain("done=true");
  });

  it("emits numeric 0 as value", () => {
    const args = buildArgs("search", { limit: 0 }, undefined, "V");
    expect(args).toContain("limit=0");
  });

  it("emits empty string as value", () => {
    const args = buildArgs("read", { file: "" }, undefined, "V");
    expect(args).toContain("file=");
  });

  it("maintains correct ordering: vault, command, params, flags", () => {
    const args = buildArgs("search", { query: "test" }, ["total"], "V");
    expect(args[0]).toBe("vault=V");
    expect(args[1]).toBe("search");
    expect(args[2]).toBe("query=test");
    expect(args[3]).toBe("total");
  });

  it("reads vault from OBSIDIAN_VAULT env var", () => {
    const saved = process.env.OBSIDIAN_VAULT;
    process.env.OBSIDIAN_VAULT = "EnvVault";
    try {
      const args = buildArgs("read", { file: "Note" });
      expect(args[0]).toBe("vault=EnvVault");
    } finally {
      if (saved !== undefined) {
        process.env.OBSIDIAN_VAULT = saved;
      } else {
        delete process.env.OBSIDIAN_VAULT;
      }
    }
  });
});

// ─── runObsidianCli (mocked execFile) ─────────────────────────────

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    execFile: vi.fn(),
    execFileSync: vi.fn(() => "/tmp/"),
  };
});

// Must re-import after mocking
const { runObsidianCli } = await import("../cli.js");
const mockExecFile = vi.mocked(execFile);

describe("runObsidianCli", () => {
  const savedCliPath = process.env.OBSIDIAN_CLI_PATH;
  const savedTimeout = process.env.OBSIDIAN_TIMEOUT;

  beforeEach(() => {
    mockExecFile.mockReset();
    process.env.OBSIDIAN_CLI_PATH = "/usr/bin/obsidian";
    delete process.env.OBSIDIAN_TIMEOUT;
  });

  afterEach(() => {
    if (savedCliPath !== undefined) {
      process.env.OBSIDIAN_CLI_PATH = savedCliPath;
    } else {
      delete process.env.OBSIDIAN_CLI_PATH;
    }
    if (savedTimeout !== undefined) {
      process.env.OBSIDIAN_TIMEOUT = savedTimeout;
    } else {
      delete process.env.OBSIDIAN_TIMEOUT;
    }
  });

  it("resolves with trimmed stdout/stderr on success", async () => {
    mockExecFile.mockImplementation((_bin, _args, _opts, cb) => {
      (cb as ExecFileCallback)(null, "  output  \n", "  warn  \n");
      return {} as ReturnType<typeof execFile>;
    });

    const result = await runObsidianCli("read", { file: "test" });
    expect(result.stdout).toBe("output");
    expect(result.stderr).toBe("warn");
  });

  it("rejects with descriptive error on ENOENT", async () => {
    mockExecFile.mockImplementation((_bin, _args, _opts, cb) => {
      const err = Object.assign(new Error("not found"), { code: "ENOENT" });
      (cb as ExecFileCallback)(err, "", "");
      return {} as ReturnType<typeof execFile>;
    });

    await expect(runObsidianCli("read", {})).rejects.toThrow("Obsidian CLI not found");
  });

  it("rejects with timeout message when killed", async () => {
    mockExecFile.mockImplementation((_bin, _args, _opts, cb) => {
      const err = Object.assign(new Error("timeout"), { killed: true });
      (cb as ExecFileCallback)(err, "", "");
      return {} as ReturnType<typeof execFile>;
    });

    await expect(runObsidianCli("read", {})).rejects.toThrow("timed out");
  });

  it("resolves with stderr on non-zero exit code", async () => {
    mockExecFile.mockImplementation((_bin, _args, _opts, cb) => {
      const err = Object.assign(new Error("exit 1"), { code: 1 });
      (cb as ExecFileCallback)(err, "", "command failed");
      return {} as ReturnType<typeof execFile>;
    });

    const result = await runObsidianCli("read", {});
    expect(result.stderr).toBe("command failed");
  });

  it("defaults to empty strings for null stdout/stderr", async () => {
    mockExecFile.mockImplementation((_bin, _args, _opts, cb) => {
      (cb as ExecFileCallback)(null, null, null);
      return {} as ReturnType<typeof execFile>;
    });

    const result = await runObsidianCli("read", {});
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  it("uses OBSIDIAN_CLI_PATH override", async () => {
    process.env.OBSIDIAN_CLI_PATH = "/custom/obsidian";
    mockExecFile.mockImplementation((bin, _args, _opts, cb) => {
      expect(bin).toBe("/custom/obsidian");
      (cb as ExecFileCallback)(null, "ok", "");
      return {} as ReturnType<typeof execFile>;
    });

    await runObsidianCli("read", {});
  });

  it("uses default timeout of 30000", async () => {
    mockExecFile.mockImplementation((_bin, _args, opts, cb) => {
      expect((opts as { timeout: number }).timeout).toBe(30000);
      (cb as ExecFileCallback)(null, "ok", "");
      return {} as ReturnType<typeof execFile>;
    });

    await runObsidianCli("read", {});
  });

  it("uses OBSIDIAN_TIMEOUT override", async () => {
    process.env.OBSIDIAN_TIMEOUT = "5000";
    mockExecFile.mockImplementation((_bin, _args, opts, cb) => {
      expect((opts as { timeout: number }).timeout).toBe(5000);
      (cb as ExecFileCallback)(null, "ok", "");
      return {} as ReturnType<typeof execFile>;
    });

    await runObsidianCli("read", {});
  });

  it("falls back to default for invalid OBSIDIAN_TIMEOUT", async () => {
    process.env.OBSIDIAN_TIMEOUT = "abc";
    mockExecFile.mockImplementation((_bin, _args, opts, cb) => {
      expect((opts as { timeout: number }).timeout).toBe(30000);
      (cb as ExecFileCallback)(null, "ok", "");
      return {} as ReturnType<typeof execFile>;
    });

    await runObsidianCli("read", {});
  });

  it("rejects with 'Operation cancelled' when signal is pre-aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    mockExecFile.mockImplementation((_bin, _args, _opts, _cb) => {
      return { kill: vi.fn() } as unknown as ReturnType<typeof execFile>;
    });

    await expect(runObsidianCli("read", {}, undefined, undefined, { signal: controller.signal })).rejects.toThrow(
      "Operation cancelled",
    );
  });

  it("rejects with 'Operation cancelled' when signal fires during execution", async () => {
    const controller = new AbortController();
    const killFn = vi.fn();

    mockExecFile.mockImplementation((_bin, _args, _opts, _cb) => {
      // Don't call callback — simulate a pending operation
      return { kill: killFn } as unknown as ReturnType<typeof execFile>;
    });

    const promise = runObsidianCli("read", {}, undefined, undefined, { signal: controller.signal });

    // Abort after starting
    controller.abort();

    await expect(promise).rejects.toThrow("Operation cancelled");
    expect(killFn).toHaveBeenCalled();
  });

  it("works normally when no signal is provided", async () => {
    mockExecFile.mockImplementation((_bin, _args, _opts, cb) => {
      (cb as ExecFileCallback)(null, "ok", "");
      return {} as ReturnType<typeof execFile>;
    });

    const result = await runObsidianCli("read", {}, undefined, undefined, undefined);
    expect(result.stdout).toBe("ok");
  });

  it("rejects with startup message when Obsidian returns app launch logs", async () => {
    mockExecFile.mockImplementation((_bin, _args, _opts, cb) => {
      (cb as ExecFileCallback)(null, "Loaded main app package /some/path", "");
      return {} as ReturnType<typeof execFile>;
    });

    await expect(runObsidianCli("read", {})).rejects.toThrow("Obsidian is starting up");
  });
});
