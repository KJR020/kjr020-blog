import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "@/components/scrapbox/queryClient";
import { cleanScrapboxDescription, ScrapboxCardList } from "@/components/scrapbox/ScrapboxCardList";
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

  it("取得は成功しページが0件なら領域を畳む印だけを残す", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { container } = render(<ScrapboxCardList project="project name" />);

    await waitFor(() => expect(container.querySelector("[data-notes-empty]")).toBeInTheDocument());
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /再読み込み/ })).not.toBeInTheDocument();
  });

  it("取得に失敗したら0件と区別できるエラーと再読み込みを表示する", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 500 }));

    const { container } = render(<ScrapboxCardList project="project name" />);

    await waitFor(
      () => expect(screen.getByText("Cosenseを読み込めませんでした")).toBeInTheDocument(),
      { timeout: 5000 },
    );
    expect(screen.getByRole("button", { name: /再読み込み/ })).toBeInTheDocument();
    expect(container.querySelector("[data-notes-empty]")).not.toBeInTheDocument();
  });

  it("project未指定ならfetchせずエラー表示する", () => {
    render(<ScrapboxCardList project="" />);

    expect(screen.getByText("プロジェクト名を指定してください")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("cleanScrapboxDescription", () => {
  // Cosenseの記法を、一覧で読める平文へ変換する
  it.each([
    ["内部リンクは括弧を外して語を残す", "[ONNX]のモデル", "ONNXのモデル"],
    ["装飾記法は記号を外して語を残す", "[* 職業] Webエンジニア", "職業 Webエンジニア"],
    ["複数記号の装飾記法も語を残す", "[*/ 強調] 本文", "強調 本文"],
    [
      "ラベル付き外部リンクはラベルを残す",
      "[https://example.com/x 記事タイトル] 参照",
      "記事タイトル 参照",
    ],
    [
      "ラベルが先の外部リンクもラベルを残す",
      "[記事タイトル https://example.com/x] 参照",
      "記事タイトル 参照",
    ],
    ["画像だけの括弧は取り除く", "[https://scrapbox.io/files/a.png] 本文", "本文"],
    ["アイコン記法は取り除く", "推論を実行する [KJR020.icon]", "推論を実行する"],
    ["裸のURLは取り除く", "参照 https://example.com/x 終わり", "参照 終わり"],
    ["連続する空白を1つにまとめる", "a   b\n c", "a b c"],
  ])("%s", (_case, input, expected) => {
    expect(cleanScrapboxDescription(input)).toBe(expected);
  });
});
