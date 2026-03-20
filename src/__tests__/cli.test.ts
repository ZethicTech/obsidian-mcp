import { describe, expect, it } from "vitest";

import { buildArgs } from "../cli.js";

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
});
