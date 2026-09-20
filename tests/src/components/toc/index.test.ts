import { describe, expect, it } from "vitest";
import { hasTableOfContents } from "@/components/toc/index";

describe("hasTableOfContents", () => {
  it("見出しがある場合だけ目次を表示する", () => {
    expect(hasTableOfContents([])).toBe(false);
    expect(hasTableOfContents([{ id: "overview", text: "概要", level: 2 }])).toBe(true);
  });
});
