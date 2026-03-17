import { execFile } from "node:child_process";
import { platform } from "node:os";
import type { CliResult } from "./types.js";

function getObsidianBinary(): string {
  const override = process.env.OBSIDIAN_CLI_PATH;
  if (override) return override;

  switch (platform()) {
    case "win32":
      return "Obsidian.com";
    default:
      return "obsidian";
  }
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

export async function runObsidianCli(
  command: string,
  params?: Record<string, unknown>,
  flags?: string[],
  vault?: string,
): Promise<CliResult> {
  const binary = getObsidianBinary();
  const args = buildArgs(command, params, flags, vault);
  const timeout = getTimeout();

  return new Promise((resolve, reject) => {
    execFile(binary, args, { timeout }, (error, stdout, stderr) => {
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
          reject(
            new Error(
              `Obsidian CLI timed out after ${timeout}ms. Is the Obsidian app running?`,
            ),
          );
          return;
        }

        // Non-zero exit code — return stderr as error info
        resolve({
          stdout: stdout?.trim() ?? "",
          stderr: stderr?.trim() ?? error.message,
        });
        return;
      }

      resolve({
        stdout: stdout?.trim() ?? "",
        stderr: stderr?.trim() ?? "",
      });
    });
  });
}
