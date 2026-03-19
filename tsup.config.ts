import { createRequire } from "node:module";
import { defineConfig } from "tsup";

const require = createRequire(import.meta.url);
const pkg = require("./package.json") as { name: string; version: string };

const shared = {
  format: "esm" as const,
  target: "node20" as const,
  outDir: "dist",
  splitting: false,
  define: {
    "process.env.PKG_NAME": JSON.stringify(pkg.name),
    "process.env.PKG_VERSION": JSON.stringify(pkg.version),
  },
};

export default defineConfig([
  {
    ...shared,
    entry: { "src/index": "src/index.ts" },
    clean: true,
  },
  {
    ...shared,
    entry: { "bin/obsidian-mcp": "bin/obsidian-mcp.ts" },
    banner: { js: "#!/usr/bin/env node" },
  },
]);
