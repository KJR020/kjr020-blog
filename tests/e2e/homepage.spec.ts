import { expect, test } from "playwright/test";

test.describe("トップページのブランド表現", () => {
  test("ヘッダーとヒーローで正式なブログ名を表示する", async ({ page }) => {
    await page.goto("/__test/home");

    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "KJR020's Blog", exact: true })).toBeVisible();
    await expect(header.locator("a[href='/'] img")).toHaveAttribute(
      "src",
      "/images/kjr020-eyes.svg",
    );
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "KJR020's Blog",
      }),
    ).toBeVisible();
    const heroImage = page.locator("main img[alt='KJR020']");
    await expect(heroImage).toHaveCount(1);
    await expect(heroImage).toHaveAttribute("src", "/images/kuri_photo.png");
    if ((page.viewportSize()?.width ?? 0) >= 640) {
      await expect(heroImage).toBeVisible();
    } else {
      await expect(heroImage).toBeHidden();
    }
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

  test("ロゴの黒目を透明背景から独立したpathで描画する", async ({ page }) => {
    await page.goto("/__test/home");

    const logoSvg = await page.evaluate(async () => {
      const response = await fetch("/images/kjr020-eyes.svg");
      return response.text();
    });

    expect(logoSvg).toContain('data-part="eye"');
    expect(logoSvg).toContain('data-part="pupil"');
    expect(logoSvg).not.toContain('d="M0 0h1400v700H0z"');
  });

  test("気取らない紹介文を2行で表示する", async ({ page }) => {
    await page.goto("/__test/home");

    await expect(page.getByText("とあるWebエンジニアのブログ。")).toBeVisible();
    await expect(page.getByText("調べたこと、やってみたことを書いています。")).toBeVisible();
    await expect(page.locator("main")).not.toContainText("技術ブログ兼思考ログ");
  });

  test("写真の上下をタイトルと紹介文へ揃える", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/__test/home");

    const heroImage = page.locator("main img[alt='KJR020']");
    const heroText = page.getByRole("heading", { level: 1, name: "KJR020's Blog" }).locator("..");
    const [imageBox, textBox] = await Promise.all([
      heroImage.boundingBox(),
      heroText.boundingBox(),
    ]);

    if (!imageBox || !textBox) {
      throw new Error("ヒーロー画像または紹介テキストの領域を取得できませんでした");
    }

    expect(Math.abs(imageBox.y - textBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(imageBox.height - textBox.height)).toBeLessThanOrEqual(1);
  });

  test("プロフィール領域を上下対称の余白で配置する", async ({ page }) => {
    await page.goto("/__test/home");

    const hero = page
      .getByRole("heading", { level: 1, name: "KJR020's Blog" })
      .locator("xpath=ancestor::section");
    const container = hero.locator("..");
    const [heroSpacing, containerSpacing] = await Promise.all([
      hero.evaluate((element) => {
        const styles = getComputedStyle(element);

        return {
          paddingBottom: styles.paddingBottom,
          paddingTop: styles.paddingTop,
        };
      }),
      container.evaluate((element) => getComputedStyle(element).paddingTop),
    ]);

    expect(heroSpacing.paddingTop).toBe(heroSpacing.paddingBottom);
    expect(containerSpacing).toBe("0px");
  });
});

test.describe("トップページの記事検索", () => {
  test("検索をScrapboxとTagsの間へ補助導線として配置する", async ({ page }) => {
    await page.goto("/");

    const sections = page.locator("main section");
    await expect(sections).toHaveCount(5);
    await expect(sections.nth(1)).toHaveAttribute("id", "latest-posts");
    await expect(sections.nth(2)).toHaveAttribute("id", "scrapbox");
    await expect(sections.nth(3)).toHaveAttribute("id", "search");
    await expect(sections.nth(4)).toHaveAttribute("id", "tags");
  });

  test("Home上で記事を検索できる", async ({ page }) => {
    await page.goto("/#search");

    const searchSection = page.locator("section#search");
    await expect(
      searchSection.getByRole("heading", { level: 2, name: "Search" }),
    ).toBeVisible();
    await expect(
      searchSection.getByRole("searchbox", { name: "記事を検索" }),
    ).toHaveAttribute("placeholder", "キーワードを入力");
    await expect(
      searchSection.getByRole("button", { name: "検索条件をクリア" }),
    ).toBeVisible();
  });

  test("ヘッダーのSearchからHome内の検索へ移動する", async ({ page }) => {
    await page.goto("/");

    if ((page.viewportSize()?.width ?? 0) < 768) {
      await page.getByRole("button", { name: "メニューを開く" }).click();
    }

    await expect(
      page.locator("header").getByRole("link", { name: /^Search/ }),
    ).toHaveAttribute("href", "/#search");
  });

  test("旧SearchページからHome内の検索へ移動する", async ({ page }) => {
    await page.goto("/search");

    await expect(page).toHaveURL(/\/#search$/);
    await expect(
      page.getByRole("searchbox", { name: "記事を検索" }),
    ).toBeVisible();
  });
});
