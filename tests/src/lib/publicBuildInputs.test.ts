import { describe, expect, it } from "vitest";
import { findForbiddenPublicPageFiles, preparePublicBuild } from "@/lib/publicBuildInputs";

describe("findForbiddenPublicPageFiles", () => {
  it("detects local instruction files in public build inputs", () => {
    const files = [
      "src/pages/CLAUDE.md",
      "src/pages/posts/CLAUDE.md",
      "src/pages/posts.astro",
      "public/data/CLAUDE.md",
      "scripts/CLAUDE.md",
      "CLAUDE.md",
    ];

    expect(findForbiddenPublicPageFiles(files)).toEqual([
      "public/data/CLAUDE.md",
      "src/pages/CLAUDE.md",
      "src/pages/posts/CLAUDE.md",
    ]);
  });
});

describe("preparePublicBuild", () => {
  it("removes the output directory before scanning public inputs", () => {
    const calls: string[] = [];

    const forbiddenFiles = preparePublicBuild({
      publicInputDirs: ["src/pages", "public"],
      outputDir: "dist",
      listFiles: (directory) => {
        calls.push(`list:${directory}`);
        return directory === "public" ? ["public/data/CLAUDE.md"] : [];
      },
      removeOutputDir: (directory) => {
        calls.push(`remove:${directory}`);
      },
    });

    expect(calls).toEqual(["remove:dist", "list:src/pages", "list:public"]);
    expect(forbiddenFiles).toEqual(["public/data/CLAUDE.md"]);
  });
});
