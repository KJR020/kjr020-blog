import { describe, expect, it } from "vitest";
import { isPublishedPost, sortPostsByNewest } from "@/lib/posts";

describe("isPublishedPost", () => {
  it.each([
    { name: "draftがfalse", data: { draft: false }, expected: true },
    { name: "draftが未指定", data: {}, expected: true },
    { name: "draftがtrue", data: { draft: true }, expected: false },
  ])("$name の記事は公開対象か: $expected", ({ data, expected }) => {
    expect(isPublishedPost({ data })).toBe(expected);
  });
});

describe("sortPostsByNewest", () => {
  const older = { id: "older", data: { date: new Date("2025-01-01T00:00:00+09:00") } };
  const newer = { id: "newer", data: { date: new Date("2026-01-01T00:00:00+09:00") } };
  const newest = { id: "newest", data: { date: new Date("2026-09-15T00:00:00+09:00") } };

  it("公開日の新しい順に並べる", () => {
    expect(sortPostsByNewest([newer, older, newest]).map((post) => post.id)).toEqual([
      "newest",
      "newer",
      "older",
    ]);
  });

  it("公開日が同じ記事は元の順序を保つ", () => {
    const first = { id: "first", data: { date: newer.data.date } };
    const second = { id: "second", data: { date: newer.data.date } };

    expect(sortPostsByNewest([first, second]).map((post) => post.id)).toEqual(["first", "second"]);
  });

  it("元の配列を変更しない", () => {
    const posts = [older, newest];

    sortPostsByNewest(posts);

    expect(posts).toEqual([older, newest]);
  });

  it("空配列は空配列を返す", () => {
    expect(sortPostsByNewest([])).toEqual([]);
  });
});
