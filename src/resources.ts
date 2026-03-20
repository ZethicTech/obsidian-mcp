import { NOT_RUNNING_MESSAGE, assertCliSuccess, isObsidianRunning, runObsidianCli } from "./cli.js";

const MIME_MAP: Record<string, string> = {
  md: "text/markdown",
  txt: "text/plain",
  json: "application/json",
  csv: "text/csv",
  html: "text/html",
  css: "text/css",
  js: "application/javascript",
  ts: "application/typescript",
  yaml: "text/yaml",
  yml: "text/yaml",
  xml: "application/xml",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  pdf: "application/pdf",
  canvas: "application/json",
};

function getVaultName(): string {
  return process.env.OBSIDIAN_VAULT ?? "default";
}

function pathToUri(vaultName: string, filePath: string): string {
  return `obsidian://${encodeURIComponent(vaultName)}/${filePath}`;
}

function uriToPath(uri: string): { vault: string; path: string } {
  const match = uri.match(/^obsidian:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid resource URI: ${uri}. Expected format: obsidian://{vault}/{path}`);
  }
  return { vault: decodeURIComponent(match[1]), path: match[2] };
}

function getMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return MIME_MAP[ext] ?? "application/octet-stream";
}

// ─── Pagination helpers ───────────────────────────────────────────

const PAGE_SIZE = 100;

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset)).toString("base64url");
}

function decodeCursor(cursor: string): number {
  const decoded = parseInt(Buffer.from(cursor, "base64url").toString(), 10);
  if (isNaN(decoded) || decoded < 0) return 0;
  return decoded;
}

// ─── Resource handlers ────────────────────────────────────────────

export async function listResources(cursor?: string): Promise<{
  resources: Array<{ uri: string; name: string; mimeType: string }>;
  nextCursor?: string;
}> {
  if (!isObsidianRunning()) {
    return { resources: [] };
  }

  const vaultName = getVaultName();
  const result = await runObsidianCli("files", {}, undefined);
  const files = result.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const offset = cursor ? decodeCursor(cursor) : 0;
  const page = files.slice(offset, offset + PAGE_SIZE);
  const hasMore = offset + PAGE_SIZE < files.length;

  return {
    resources: page.map((filePath) => ({
      uri: pathToUri(vaultName, filePath),
      name: filePath,
      mimeType: getMimeType(filePath),
    })),
    nextCursor: hasMore ? encodeCursor(offset + PAGE_SIZE) : undefined,
  };
}

export async function readResource(uri: string): Promise<{
  contents: Array<{ uri: string; mimeType: string; text: string }>;
}> {
  if (!isObsidianRunning()) {
    throw new Error(NOT_RUNNING_MESSAGE);
  }

  const { path } = uriToPath(uri);
  const mimeType = getMimeType(path);

  const result = await runObsidianCli("read", { path });

  assertCliSuccess(result);

  return {
    contents: [
      {
        uri,
        mimeType,
        text: result.stdout,
      },
    ],
  };
}

export function listResourceTemplates(): {
  resourceTemplates: Array<{
    uriTemplate: string;
    name: string;
    description: string;
    mimeType?: string;
  }>;
} {
  const vaultName = getVaultName();
  return {
    resourceTemplates: [
      {
        uriTemplate: `obsidian://${encodeURIComponent(vaultName)}/{path}`,
        name: "Vault file",
        description: "Access any file in the Obsidian vault by path",
        mimeType: "text/markdown",
      },
    ],
  };
}
