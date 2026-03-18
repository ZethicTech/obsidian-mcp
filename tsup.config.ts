import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { "src/index": "src/index.ts" },
    format: "esm",
    target: "node20",
    outDir: "dist",
    clean: true,
    splitting: false,
  },
  {
    entry: { "bin/obsidian-mcp": "bin/obsidian-mcp.ts" },
    format: "esm",
    target: "node20",
    outDir: "dist",
    splitting: false,
    banner: { js: "#!/usr/bin/env node" },
  },
]);
