/** @vitest-environment node */
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScrapboxCardList } from "@/components/scrapbox/ScrapboxCardList";
import type { ScrapboxPageData } from "@/components/scrapbox/types";

function page(title: string): ScrapboxPageData {
  return {
    id: title,
    title,
    imageUrl: null,
    description: "",
    updatedAt: "2026-05-05T00:00:00Z",
    url: `https://scrapbox.io/example/${title}`,
  };
}

describe("ScrapboxCardList のサーバー描画", () => {
  it("同じprojectを別のページで描画しても、前のページのデータを持ち越さない", () => {
    const firstHtml = renderToString(
      <ScrapboxCardList project="KJR020" pages={[page("first-page-note")]} />,
    );
    const secondHtml = renderToString(
      <ScrapboxCardList project="KJR020" pages={[page("second-page-note")]} />,
    );

    expect(firstHtml).toContain("first-page-note");
    expect(secondHtml).toContain("second-page-note");
    expect(secondHtml).not.toContain("first-page-note");
  });
});
