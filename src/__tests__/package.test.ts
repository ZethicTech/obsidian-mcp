import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as Record<string, unknown>;
const rootDir = resolve(fileURLToPath(import.meta.url), "../../..");

describe("package.json", () => {
  it("has a scoped name", () => {
    expect(pkg.name).toMatch(/^@zethictech\//);
  });

  it("version follows semver", () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("type is module", () => {
    expect(pkg.type).toBe("module");
  });

  it("main points to dist/src/index.js", () => {
    expect(pkg.main).toBe("./dist/src/index.js");
  });

  it("bin points into dist/", () => {
    const bin = pkg.bin as Record<string, string>;
    expect(bin["obsidian-mcp"]).toMatch(/^dist\//);
  });

  it("files array includes dist", () => {
    expect(pkg.files).toContain("dist");
  });

  it("engines.node is defined", () => {
    const engines = pkg.engines as Record<string, string>;
    expect(engines.node).toBeDefined();
  });

  it("has required metadata fields", () => {
    expect(pkg.description).toBeTruthy();
    expect(pkg.license).toBeTruthy();
    expect(pkg.repository).toBeTruthy();
    expect(pkg.author).toBeTruthy();
  });

  it("is not marked private", () => {
    expect(pkg.private).not.toBe(true);
  });
});

describe("build output", { skip: !existsSync(resolve(rootDir, "dist/src/index.js")) }, () => {
  it("dist/src/index.js exists", () => {
    expect(existsSync(resolve(rootDir, "dist/src/index.js"))).toBe(true);
  });

  it("dist/bin/obsidian-mcp.js exists", () => {
    expect(existsSync(resolve(rootDir, "dist/bin/obsidian-mcp.js"))).toBe(true);
  });

  it("bin file has shebang", () => {
    const content = readFileSync(resolve(rootDir, "dist/bin/obsidian-mcp.js"), "utf8");
    expect(content.startsWith("#!/usr/bin/env node")).toBe(true);
  });
});
