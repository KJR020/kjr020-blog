import { describe, expect, it } from "vitest";

import { isDesignSystemPage } from "@/design-system/navigation";

describe("isDesignSystemPage", () => {
  it.each([
    "https://kjr020.dev/design-system",
    "https://kjr020.dev/design-system/",
    "https://kjr020.dev/design-system/foundations/",
    "https://kjr020.dev/design-system/patterns#article-reading",
    "/design-system/components",
  ])("%s はカタログのページとして扱う", (url) => {
    expect(isDesignSystemPage(url)).toBe(true);
  });

  it.each([
    "https://kjr020.dev/",
    "https://kjr020.dev/posts/design-system/",
    "https://kjr020.dev/design-systems/",
    "https://kjr020.dev/tags/design-system/",
  ])("%s はカタログのページとして扱わない", (url) => {
    expect(isDesignSystemPage(url)).toBe(false);
  });
});
