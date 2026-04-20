import { execFile, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join } from "node:path";

import type { CliResult } from "./types.js";

const IS_MACOS = platform() === "darwin";

// On macOS, Obsidian's CLI finds the running app via a singleton socket in the
// user temp dir. Claude Desktop doesn't set TMPDIR, so it falls back to /tmp
// (wrong). Use getconf to resolve the real per-user temp dir — cached since it
// never changes during a session.
const MACOS_ENV: NodeJS.ProcessEnv | undefined = (() => {
  if (!IS_MACOS) return undefined;
  let tmpdir = process.env.TMPDIR ?? "/tmp";
  if (tmpdir === "/tmp") {
    try {
      tmpdir = execFileSync("/usr/bin/getconf", ["DARWIN_USER_TEMP_DIR"], { encoding: "utf8" }).trim();
    } catch {
      /* fall back to /tmp */
    }
  }
  return { ...process.env, TMPDIR: tmpdir, HOME: homedir() };
})();

// Well-known Obsidian CLI locations per platform
const KNOWN_PATHS: Record<string, string[]> = {
  darwin: ["/Applications/Obsidian.app/Contents/MacOS/obsidian", "/opt/homebrew/bin/obsidian"],
  linux: ["/usr/local/bin/obsidian", `${process.env.HOME}/.local/bin/obsidian`],
  win32: [`${process.env.LOCALAPPDATA}\\Obsidian\\Obsidian.com`],
};

function getObsidianBinary(): string {
  const override = process.env.OBSIDIAN_CLI_PATH;
  if (override) return override;

  // Try bare command name first (works if it's in PATH)
  const defaultName = platform() === "win32" ? "Obsidian.com" : "obsidian";

  // Check well-known paths as fallback for environments with limited PATH
  // (e.g. Claude Desktop doesn't source ~/.zprofile)
  const candidates = KNOWN_PATHS[platform()] ?? [];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return defaultName;
}

function getTimeout(): number {
  const env = process.env.OBSIDIAN_TIMEOUT;
  if (env) {
    const parsed = parseInt(env, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 30_000;
}

function getVault(): string | undefined {
  return process.env.OBSIDIAN_VAULT;
}

export function buildArgs(
  command: string,
  params?: Record<string, unknown>,
  flags?: string[],
  vault?: string,
): string[] {
  const resolvedVault = vault ?? getVault();
  const args: string[] = [];

  if (resolvedVault) {
    args.push(`vault=${resolvedVault}`);
  }

  args.push(command);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === false) continue;
      if (value === true) {
        // Boolean flags without value
        flags = flags ?? [];
        flags.push(key);
        continue;
      }
      args.push(`${key}=${String(value)}`);
    }
  }

  if (flags) {
    for (const flag of flags) {
      args.push(flag);
    }
  }

  return args;
}

export function assertCliSuccess(result: CliResult): void {
  if (result.stderr && !result.stdout) {
    throw new Error(result.stderr);
  }
}

export interface CliOptions {
  signal?: AbortSignal;
}

const STARTUP_SENTINEL = "Loaded main app package";
const NOT_RUNNING_MSG = "Obsidian is not running. Please open Obsidian and try again.";

function looksLikeStartup(output: string): boolean {
  return output.includes(STARTUP_SENTINEL);
}

export async function runObsidianCli(
  command: string,
  params?: Record<string, unknown>,
  flags?: string[],
  vault?: string,
  options?: CliOptions,
): Promise<CliResult> {
  const binary = getObsidianBinary();
  const args = buildArgs(command, params, flags, vault);
  const timeout = getTimeout();

  return new Promise((resolve, reject) => {
    let settled = false;

    const killAndReject = (err: Error) => {
      if (settled) return;
      settled = true;
      child.kill();
      options?.signal?.removeEventListener("abort", onAbort);
      reject(err);
    };

    const onAbort = () => killAndReject(new Error("Operation cancelled"));

    const child = execFile(binary, args, { timeout, env: MACOS_ENV }, (error, stdout, stderr) => {
      if (settled) return;
      settled = true;
      options?.signal?.removeEventListener("abort", onAbort);

      if (error) {
        const code = (error as NodeJS.ErrnoException).code;

        if (code === "ENOENT") {
          reject(
            new Error(
              `Obsidian CLI not found. Ensure Obsidian 1.12+ is installed and the CLI is enabled in Settings > General > CLI.\n` +
                `Looked for: ${binary}\n` +
                `Set OBSIDIAN_CLI_PATH to override.`,
            ),
          );
          return;
        }

        if (error.killed) {
          reject(new Error(`Obsidian CLI timed out after ${timeout}ms. Is the Obsidian app running?`));
          return;
        }

        // Non-zero exit code — return stderr as error info
        const out = stdout?.trim() ?? "";
        if (looksLikeStartup(out)) {
          reject(new Error(NOT_RUNNING_MSG));
          return;
        }
        resolve({ stdout: out, stderr: stderr?.trim() ?? error.message });
        return;
      }

      const out = stdout?.trim() ?? "";
      if (looksLikeStartup(out)) {
        reject(new Error(NOT_RUNNING_MSG));
        return;
      }
      resolve({ stdout: out, stderr: stderr?.trim() ?? "" });
    });

    // Detect startup logs in real-time (~1-2s) instead of waiting for 30s timeout.
    // When the CLI launches a new Electron instance instead of connecting to a
    // running one, it emits "Loaded main app package" to stdout almost immediately.
    child.stdout?.on("data", (chunk: Buffer) => {
      if (looksLikeStartup(chunk.toString())) {
        killAndReject(new Error(NOT_RUNNING_MSG));
      }
    });

    // Support cancellation via AbortSignal
    if (options?.signal) {
      if (options.signal.aborted) {
        killAndReject(new Error("Operation cancelled"));
        return;
      }
      options.signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

// ─── Template folder detection ──────────────────────────────────

export interface TemplateSource {
  source: "Core Templates" | "Templater";
  folder: string;
}

export async function getVaultPath(options?: CliOptions): Promise<string> {
  const result = await runObsidianCli("vault", { info: "path" }, undefined, undefined, options);
  const path = result.stdout?.trim();
  if (!path) {
    const detail = result.stderr?.trim();
    throw new Error(detail || "Could not determine vault path. Is Obsidian running with a vault open?");
  }
  return path;
}

export async function detectTemplateFolders(vaultPath: string): Promise<TemplateSource[]> {
  const sources: TemplateSource[] = [];
  const seen = new Set<string>();

  // Core Templates plugin
  try {
    const raw = await readFile(join(vaultPath, ".obsidian", "templates.json"), "utf-8");
    const config = JSON.parse(raw) as { folder?: string };
    if (config.folder) {
      sources.push({ source: "Core Templates", folder: config.folder });
      seen.add(config.folder);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  // Templater community plugin
  try {
    const raw = await readFile(join(vaultPath, ".obsidian", "plugins", "templater-obsidian", "data.json"), "utf-8");
    const config = JSON.parse(raw) as { templates_folder?: string };
    if (config.templates_folder && !seen.has(config.templates_folder)) {
      sources.push({ source: "Templater", folder: config.templates_folder });
      seen.add(config.templates_folder);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  return sources;
}
