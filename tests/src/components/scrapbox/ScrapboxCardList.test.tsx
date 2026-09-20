import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "@/components/scrapbox/queryClient";
import { ScrapboxCardList } from "@/components/scrapbox/ScrapboxCardList";
import type { ScrapboxPageData } from "@/components/scrapbox/types";

function page(id: string, overrides?: Partial<ScrapboxPageData>): ScrapboxPageData {
  return {
    id,
    title: id,
    imageUrl: null,
    description: "[Scrapbox] https://example.com note",
    updatedAt: "2026-05-05T00:00:00Z",
    url: `https://scrapbox.io/example/${id}`,
    ...overrides,
  };
}

describe("ScrapboxCardList", () => {
  beforeEach(() => {
    queryClient.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    queryClient.clear();
    vi.unstubAllGlobals();
  });

  it("QueryProvider経由でproxyから取得したページを一覧表示する", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([page("one"), page("two")]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<ScrapboxCardList project="project name" limit={1} />);

    await waitFor(() => expect(screen.getByText("one")).toBeInTheDocument());

    expect(fetch).toHaveBeenCalledWith("/api/pages/project%20name?limit=100");
    expect(screen.queryByText("two")).not.toBeInTheDocument();
    expect(screen.getByText("Scrapbox note")).toBeInTheDocument();
  });

  it("取得は成功しページが0件なら対象を示す空状態を表示する", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<ScrapboxCardList project="project name" />);

    await waitFor(() =>
      expect(screen.getByText("Scrapboxのページがありません")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: /再読み込み/ })).not.toBeInTheDocument();
  });

  it("取得に失敗したら0件と区別できるエラーと再読み込みを表示する", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 500 }));

    render(<ScrapboxCardList project="project name" />);

    await waitFor(
      () => expect(screen.getByText("Scrapboxを読み込めませんでした")).toBeInTheDocument(),
      { timeout: 5000 },
    );
    expect(screen.getByRole("button", { name: /再読み込み/ })).toBeInTheDocument();
    expect(screen.queryByText("Scrapboxのページがありません")).not.toBeInTheDocument();
  });

  it("project未指定ならfetchせずエラー表示する", () => {
    render(<ScrapboxCardList project="" />);

    expect(screen.getByText("プロジェクト名を指定してください")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
