import { expect, test } from "playwright/test";

test.describe("トップページのブランド表現", () => {
  test("ヘッダーとヒーローで正式なブログ名を表示する", async ({ page }) => {
    await page.goto("/__test/home");

    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "KJR020's Blog", exact: true })).toBeVisible();
    // 著者の写真をブランドの印にする。ブログ名がリンク名を担うため、写真は装飾として扱う
    const brandMark = header.locator("a[href='/'] img");
    await expect(brandMark).toHaveAttribute("src", "/images/kuri_photo.png");
    await expect(brandMark).toHaveAttribute("alt", "");
    await expect(brandMark).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "KJR020's Blog",
      }),
    ).toBeVisible();
    // 紹介文には画像を添えない
    await expect(page.locator(".home-hero img")).toHaveCount(0);
  });

  test("ライトテーマではOSの配色設定に関係なくロゴを反転しない", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => {
      window.localStorage.setItem("theme", "light");
    });
    await page.goto("/__test/home");

    const headerLogo = page.locator("header a[href='/'] img");
    await expect(headerLogo).toHaveCSS("filter", "none");
    await expect(headerLogo).toHaveCSS("opacity", "1");
  });

  test("気取らない紹介文を2行で表示する", async ({ page }) => {
    await page.goto("/__test/home");

    await expect(page.getByText("とあるWebエンジニアのブログ。")).toBeVisible();
    await expect(page.getByText("調べたこと、やってみたことを書いています。")).toBeVisible();
    await expect(page.locator("main")).not.toContainText("技術ブログ兼思考ログ");
  });

  test("ブログ名の下の区切り線へキャラクターを立たせる", async ({ page }) => {
    // 登場アニメーションの移動量を含めずに、静止位置を測る
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/__test/home");

    const hero = page.locator("main section").first();
    const base = hero.locator(".home-hero__base");
    const character = hero.locator("[data-kuri]");
    await expect(character).toHaveAttribute("aria-hidden", "true");

    const [baseBox, characterBox] = await Promise.all([
      base.boundingBox(),
      character.boundingBox(),
    ]);
    const characterBottom = (characterBox?.y ?? 0) + (characterBox?.height ?? 0);

    expect(characterBottom).toBeCloseTo(baseBox?.y ?? 0, 0);
  });

  test("動きを減らす設定でも、眠っているフッターのキャラクターは押すと目を開ける", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/__test/home");

    const sleeper = page.locator("footer [data-kuri]");
    await sleeper.scrollIntoViewIfNeeded();
    await expect(sleeper).toHaveClass(/is-closed/);

    await sleeper.click();

    await expect(sleeper).not.toHaveClass(/is-closed/);
  });

  test("狭い画面ではブログ名を2行に組み、キャラクターと重ねない", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/__test/home");

    const lines = page.locator(".home-hero__line");
    const character = page.locator(".home-hero [data-kuri]");
    const [firstLine, secondLine, characterBox] = await Promise.all([
      lines.nth(0).boundingBox(),
      lines.nth(1).locator("span").boundingBox(),
      character.boundingBox(),
    ]);

    expect(secondLine?.y ?? 0).toBeGreaterThan(firstLine?.y ?? 0);
    expect((secondLine?.x ?? 0) + (secondLine?.width ?? 0)).toBeLessThanOrEqual(
      characterBox?.x ?? 0,
    );
  });
});

test.describe("トップページの記事探索", () => {
  test("記事を主領域、メモを補助領域へ配置し検索とタグは常設しない", async ({ page }) => {
    await page.goto("/");

    const sections = page.locator("main section");
    await expect(sections).toHaveCount(2);
    await expect(sections.nth(1)).toHaveAttribute("id", "latest-posts");
    await expect(sections.nth(1).locator(".feature")).toHaveCount(1);
    await expect(page.locator("aside#scrapbox")).toHaveCount(1);
    await expect(page.locator("section#search")).toHaveCount(0);
    await expect(page.locator("section#tags")).toHaveCount(0);
  });

  test("ヘッダーのSearchから検索ダイアログを開く", async ({ page }) => {
    await page.goto("/");

    if ((page.viewportSize()?.width ?? 0) < 768) {
      await page.getByRole("button", { name: "メニューを開く" }).click();
    }

    await page
      .locator("header")
      .getByRole("button", { name: /^Search/ })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "記事を検索" })).toBeFocused();
  });

  test("旧Searchページから検索ダイアログを開く", async ({ page }) => {
    await page.goto("/search");

    await expect(page).toHaveURL(/\/?search=open$/);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "記事を検索" })).toBeFocused();
  });
});

test.describe("記事検索の対象", () => {
  test("記事詳細だけをPagefindの検索本文として扱う", async ({ page }) => {
    await page.goto("/posts/astro/astro-pagefind-search");
    await expect(page.locator("[data-pagefind-body]")).toHaveCount(1);

    await page.goto("/tags/Astro");
    await expect(page.locator("[data-pagefind-body]")).toHaveCount(0);
  });
});
