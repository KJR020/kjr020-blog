import { expect, test } from "playwright/test";

// ビルドした成果物で、公開したカタログのメタ情報と検索対象からの除外を確かめる。

const catalogPages = [
  { path: "/design-system", title: "KJR020's Blog デザインシステム" },
  { path: "/design-system/foundations", title: "基盤 - KJR020's Blog デザインシステム" },
  { path: "/design-system/components", title: "コンポーネント - KJR020's Blog デザインシステム" },
  { path: "/design-system/patterns", title: "パターン - KJR020's Blog デザインシステム" },
  { path: "/design-system/content", title: "コンテンツ - KJR020's Blog デザインシステム" },
  { path: "/design-system/governance", title: "ガバナンス - KJR020's Blog デザインシステム" },
] as const;

for (const { path, title } of catalogPages) {
  test(`${path} を検索エンジンに索引させないメタ情報付きで公開する`, async ({ page }) => {
    const response = await page.goto(path);

    expect(response?.ok()).toBe(true);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex,nofollow",
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", title);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      "https://kjr020.dev/og-image.png",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`^https://kjr020\\.dev${path}/?$`),
    );
  });
}

test("旧URLから記事ページの仕様へ転送する", async ({ page }) => {
  for (const legacyUrl of [
    "/design-system/article-reading",
    "/design-system/patterns/article-reading",
  ]) {
    await page.goto(legacyUrl);

    await expect(page).toHaveURL(/\/design-system\/patterns\/?#article-reading$/);
    await expect(page.getByRole("heading", { level: 3, name: "8-3. 記事ページ" })).toBeVisible();
  }
});

test("サイト内検索の結果にカタログのページを含めない", async ({ page }) => {
  await page.goto("/__test/home");

  const searchUrls = (term: string) =>
    page.evaluate(async (query) => {
      const pagefindUrl = "/pagefind/pagefind.js";
      const pagefind = await import(/* @vite-ignore */ pagefindUrl);
      const search = await pagefind.search(query);
      const results = await Promise.all(
        search.results.map((result: { data: () => Promise<{ url: string }> }) => result.data()),
      );
      return results.map((result) => result.url);
    }, term);

  // 索引が機能していることを、fixture記事の本文にある語で確かめる
  expect(await searchUrls("固定本文")).toContain("/posts/__test/article/");
  // カタログに繰り返し出てくる語で検索しても、カタログは結果に出ない
  const catalogTermUrls = await searchUrls("標本");
  expect(catalogTermUrls.filter((url) => url.startsWith("/design-system"))).toEqual([]);
});
