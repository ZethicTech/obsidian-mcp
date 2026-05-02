import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";

import type { CliResult } from "./types.js";

const IS_MACOS = platform() === "darwin";

// obsidian-cli reads getenv("HOME") to locate ~/.obsidian-cli.sock. Claude
// Desktop / Claude Code child envs don't always carry HOME correctly, so we
// inject it explicitly.
const MACOS_ENV: NodeJS.ProcessEnv | undefined = IS_MACOS ? { ...process.env, HOME: homedir() } : undefined;

// Well-known obsidian-cli helper locations per platform. The helper is a
// separate binary from the Electron app — invoking the app directly boots a
// full Electron process for every call (dock-icon flash, slow, unstable).
const KNOWN_PATHS: Record<string, string[]> = {
  darwin: ["/Applications/Obsidian.app/Contents/MacOS/obsidian-cli"],
  linux: [
    `${process.env.HOME}/.local/bin/obsidian-cli`,
    "/usr/local/bin/obsidian-cli",
    `${process.env.HOME}/.local/bin/obsidian`,
    "/usr/local/bin/obsidian",
  ],
  win32: [`${process.env.LOCALAPPDATA}\\Obsidian\\Obsidian.com`],
};

function getObsidianBinary(): string {
  const override = process.env.OBSIDIAN_CLI_PATH;
  if (override) return override;

  const defaultName = platform() === "win32" ? "Obsidian.com" : "obsidian-cli";

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

        resolve({ stdout: stdout?.trim() ?? "", stderr: stderr?.trim() ?? error.message });
        return;
      }

      resolve({ stdout: stdout?.trim() ?? "", stderr: stderr?.trim() ?? "" });
    });

    if (options?.signal) {
      if (options.signal.aborted) {
        killAndReject(new Error("Operation cancelled"));
        return;
      }
      options.signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}
