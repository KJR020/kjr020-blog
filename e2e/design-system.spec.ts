import { expect, test } from "playwright/test";

test("デザインシステムを6つのトップレベルページに分けて表示する", async ({
  page,
}) => {
  const designSystemPages = [
    { path: "/design-system", title: "KJR020's Blog デザインシステム", nav: "概要" },
    { path: "/design-system/foundations", title: "基盤", nav: "基盤" },
    { path: "/design-system/components", title: "コンポーネント", nav: "コンポーネント" },
    { path: "/design-system/patterns", title: "パターン", nav: "パターン" },
    { path: "/design-system/content", title: "コンテンツ", nav: "コンテンツ" },
    { path: "/design-system/governance", title: "ガバナンス", nav: "ガバナンス" },
  ];

  for (const designSystemPage of designSystemPages) {
    const response = await page.goto(designSystemPage.path);

    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole("heading", { level: 1, name: designSystemPage.title }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "デザインシステム" })
        .getByRole("link", { name: designSystemPage.nav, exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }
});

test("カテゴリカードはカード全体をリンクにして補助ラベルを重ねない", async ({ page }) => {
  await page.goto("/design-system");

  const directory = page.locator(".design-system-directory");
  await expect(directory.locator("a.spec-page-link")).toHaveCount(5);
  await expect(directory).not.toContainText("開く");
  await expect(directory.locator(".spec-page-link > span")).toHaveText([
    "視覚表現とレイアウトの共通ルール",
    "再利用するUI部品とナビゲーション",
    "状態・記事・ページを組み立てる方法",
    "声の性格とUI文言のルール",
    "正規仕様の適用と更新ルール",
  ]);
});

test("記事ページの仕様をパターンページに統合して表示する", async ({ page }) => {
  const response = await page.goto("/design-system/patterns#article-reading");

  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { level: 1, name: "パターン" })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "8-3. 記事ページ" }),
  ).toBeVisible();
  await expect(page.locator("#reading-model")).toBeVisible();
  await expect(page.locator("#reading-layout")).toBeVisible();
  await expect(page.locator("#reading-layout .lane-header")).toContainText("記事ヘッダー");
  await expect(page.locator("#reading-layout .lane-character-area")).toContainText(
    "キャラクター領域",
  );
  await expect(page.locator("#reading-typography")).toBeVisible();
  await expect(page.locator("#figure-pattern")).toBeVisible();
  await expect(page.locator("#code-pattern")).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "デザインシステム" })
      .getByRole("link", { name: "記事ページ", exact: true }),
  ).toHaveAttribute("href", "/design-system/patterns#article-reading");
});

test("記事ページを記事要素ではなくページの型として分類する", async ({ page }) => {
  await page.goto("/design-system/patterns#article-reading");

  await expect(page.locator("#article > .spec-item > h3")).toHaveText([
    "7-1. Markdown本文",
    "7-2. Callout",
    "7-3. Link Card",
    "7-4. Code Copy / Image",
  ]);
  await expect(page.locator("#pages > .spec-item > h3")).toHaveText([
    "8-1. ホーム",
    "8-2. 記事一覧",
    "8-3. 記事ページ",
    "8-4. 検索",
    "8-5. ポリシー・状態",
  ]);
  await expect(page.locator("#pages > #article-reading")).toBeVisible();

  const navigation = page.getByRole("navigation", { name: "デザインシステム" });
  await expect(navigation.getByRole("link", { name: "記事ページ", exact: true })).toHaveAttribute(
    "href",
    "/design-system/patterns#article-reading",
  );
  await expect(navigation.getByText("記事読書設計", { exact: true })).toHaveCount(0);
});

test("Header標本は本番と同じ目のシンボルを表示する", async ({ page }) => {
  await page.goto("/design-system/components#global-navigation");

  const headerSpecimen = page.locator("#global-navigation");
  const brandMark = headerSpecimen.locator(".site-brand-demo img");

  await expect(brandMark).toHaveAttribute("src", "/images/kjr020-eyes.svg");
  await expect(brandMark).toHaveAttribute("width", "50");
  await expect(brandMark).toHaveAttribute("height", "32");
  await expect(brandMark).toHaveAttribute("alt", "");
});

test("目次標本は本番と同じ開閉操作を試せる", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/design-system/components#table-of-contents");

  const specimen = page.locator("#table-of-contents");
  const navigation = specimen.getByRole("navigation", { name: "目次" });

  await expect(navigation).toBeVisible();
  await specimen.getByRole("button", { name: "目次を隠す" }).click();
  await expect(navigation).toBeHidden();

  await specimen.getByRole("button", { name: "目次を表示" }).click();
  await expect(navigation).toBeVisible();
});

test("目次標本はモバイル幅でインライン目次を開閉できる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-system/components#table-of-contents");

  const specimen = page.locator("#table-of-contents");
  const trigger = specimen.getByRole("button", { name: "目次を開く" });

  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(specimen.getByRole("navigation", { name: "目次" })).toBeVisible();
  await expect(specimen.getByRole("button", { name: "目次を閉じる" })).toBeVisible();
});

test("Mediumでは記事ヘッダーのキャラクター領域を表示しない", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/design-system/patterns#reading-layout");

  await expect(page.locator("#reading-layout .lane-character-area")).toBeHidden();
});

test("本文組版の標本も768pxからMediumの文字サイズを使う", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/design-system/patterns#reading-typography");

  const paragraph = page.locator("#reading-typography .type-candidate p");
  await expect(paragraph).toHaveCSS("font-size", "17px");
});

test("サイドバーはどのページでも全カテゴリの項目を保持する", async ({ page }) => {
  await page.goto("/design-system/foundations");

  const navigation = page.getByRole("navigation", { name: "デザインシステム" });
  const typographyLink = navigation.getByRole("link", { name: "タイポグラフィ", exact: true });
  const buttonLink = navigation.getByRole("link", {
    name: "ボタン",
    exact: true,
    includeHidden: true,
  });
  const stateMessageLink = navigation.getByRole("link", {
    name: "状態メッセージ",
    exact: true,
    includeHidden: true,
  });
  await expect(typographyLink).toHaveCount(1);
  await expect(buttonLink).toHaveCount(1);
  await expect(stateMessageLink).toHaveCount(1);
  await expect(typographyLink).toBeVisible();
  await expect(buttonLink).toBeHidden();
  await expect(stateMessageLink).toBeHidden();

  await page.goto("/design-system/content");
  const contentNavigation = page.getByRole("navigation", { name: "デザインシステム" });
  const contentTypographyLink = contentNavigation.getByRole("link", {
    name: "タイポグラフィ",
    exact: true,
    includeHidden: true,
  });
  const contentStateMessageLink = contentNavigation.getByRole("link", {
    name: "状態メッセージ",
    exact: true,
    includeHidden: true,
  });
  await expect(contentTypographyLink).toHaveCount(1);
  await expect(contentStateMessageLink).toHaveCount(1);
  await expect(contentTypographyLink).toBeHidden();
  await expect(contentStateMessageLink).toBeVisible();
});

test("サイドバーの章見出しから対応するフラグメントへ移動できる", async ({ page }) => {
  await page.goto("/design-system/patterns");

  const navigation = page.getByRole("navigation", { name: "デザインシステム" });
  await expect(
    navigation.getByRole("link", { name: "3. 状態の体系", exact: true }),
  ).toHaveAttribute("href", "/design-system/patterns#states");
  await expect(
    navigation.getByRole("link", { name: "7. 記事コンテンツ", exact: true }),
  ).toHaveAttribute("href", "/design-system/patterns#article");
  await expect(
    navigation.getByRole("link", { name: "8. ページの型", exact: true }),
  ).toHaveAttribute("href", "/design-system/patterns#pages");

  await navigation.getByRole("link", { name: "7. 記事コンテンツ", exact: true }).click();
  await expect(page).toHaveURL(/\/design-system\/patterns#article$/);
  await expect(
    page.locator("#article").getByRole("heading", {
      level: 2,
      name: "7. 記事コンテンツ",
    }),
  ).toBeVisible();
});

test("現在のカテゴリだけを初期展開し、複数カテゴリを開閉できる", async ({ page }) => {
  await page.goto("/design-system/foundations");

  const navigation = page.getByRole("navigation", { name: "デザインシステム" });
  const foundationsToggle = navigation.getByRole("button", {
    name: "基盤のセクションを開閉",
  });
  const componentsToggle = navigation.getByRole("button", {
    name: "コンポーネントのセクションを開閉",
  });

  await expect(foundationsToggle).toHaveAttribute("aria-expanded", "true");
  await expect(componentsToggle).toHaveAttribute("aria-expanded", "false");

  await componentsToggle.click();
  await expect(foundationsToggle).toHaveAttribute("aria-expanded", "true");
  await expect(componentsToggle).toHaveAttribute("aria-expanded", "true");
  await expect(navigation.getByRole("link", { name: "ボタン", exact: true })).toBeVisible();

  await foundationsToggle.click();
  await expect(foundationsToggle).toHaveAttribute("aria-expanded", "false");
  await expect(componentsToggle).toHaveAttribute("aria-expanded", "true");
});

test("分割前のアンカーを新しいページへ引き継ぐ", async ({ page }) => {
  await page.goto("/design-system#typography");

  await expect(page).toHaveURL(/\/design-system\/foundations#typography$/);
  await expect(page.getByRole("heading", { level: 3, name: "1-3. 文字階層" })).toBeVisible();
});

test("旧記事読書設計URLからパターン内の統合位置へ移動する", async ({ page }) => {
  for (const legacyUrl of [
    "/design-system/article-reading",
    "/design-system/patterns/article-reading",
  ]) {
    await page.goto(legacyUrl);

    await expect(page).toHaveURL(/\/design-system\/patterns#article-reading$/);
  }
});

test("実装とつながったデザインシステムを表示する", async ({ page }) => {
  const response = await page.goto("/design-system");

  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "KJR020's Blog デザインシステム",
    }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex,nofollow",
  );

  await expect(page.locator('body[data-layout="specimen-book"]')).toBeVisible();
  const header = page.getByRole("banner");
  await expect(header).toBeVisible();
  await expect(header.getByRole("link", { name: "KJR020's Blog" })).toHaveAttribute("href", "/");
  await expect(header.getByRole("link", { name: "Posts" })).toHaveAttribute("href", "/posts");
  await expect(header.getByRole("link", { name: /Search/ })).toHaveAttribute("href", "/search");
  await expect(header.getByRole("link", { name: /Scrapbox/ })).toHaveAttribute(
    "href",
    "https://scrapbox.io/kjr020/",
  );
  await expect(page.locator("main > .toc")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "技術記事の静かな案内役" }),
  ).toHaveCount(0);
  await expect(page.locator(".ds-hero")).toHaveCount(0);
  await expect(page.locator(".ds-sidebar")).toHaveCount(0);

  const categoryNavigation = page.getByRole("navigation", {
    name: "デザインシステムのカテゴリ",
  });
  await expect(categoryNavigation.getByRole("link")).toHaveCount(5);
  await expect(categoryNavigation.getByRole("link", { name: /^基盤/ })).toHaveAttribute(
    "href",
    "/design-system/foundations",
  );
  await expect(page.locator("#tokens")).toHaveCount(0);

  await page.goto("/design-system/foundations#color");
  await expect(page.locator('[data-token="--background"]')).toBeVisible();
  await page.goto("/design-system/components#button");
  await expect(
    page.locator('[data-slot="button"][data-variant="default"]').first(),
  ).toBeVisible();
  await expect(page.locator('[data-slot="badge"]').first()).toBeVisible();
  await expect(page.locator('[data-slot="input"]').first()).toBeVisible();
  await expect(page.locator('[data-slot="card"]').first()).toBeVisible();
});

test("名称をデザインシステムに統一する", async ({ page }) => {
  await page.goto("/design-system");

  await expect(page.locator("body")).not.toContainText("DEV ONLY");
  await expect(page.locator("body")).not.toContainText("開発環境限定");
  await expect(page.locator("body")).not.toContainText("開発サーバーでのみ表示");
  await expect(page.getByRole("link", { name: "ブログを見る" })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Living Design System");
  await expect(page.locator("body")).not.toContainText("見本帳");
  await expect(page.locator("body")).not.toContainText("KJR020ブログ");
});

test("共通ヘッダーはページに関わらずsystem sansを使う", async ({ page }) => {
  await page.goto("/design-system");
  const designSystemFont = await page
    .getByRole("banner")
    .evaluate((element) => getComputedStyle(element).fontFamily);

  await page.goto("/");
  const blogFont = await page
    .getByRole("banner")
    .evaluate((element) => getComputedStyle(element).fontFamily);

  expect(designSystemFont).toBe(blogFont);
  expect(blogFont).toContain("ui-sans-serif");
});

test("ヘッダー・本文・コードで合意したフォントを使い分ける", async ({ page }) => {
  await page.goto("/");

  const headerFont = await page
    .getByRole("banner")
    .evaluate((element) => getComputedStyle(element).fontFamily);
  const bodyFont = await page
    .locator("body")
    .evaluate((element) => getComputedStyle(element).fontFamily);

  expect(headerFont).toContain("ui-sans-serif");
  expect(bodyFont).toContain("Noto Sans JP");
  await expect(
    page.locator(
      'link[href^="https://fonts.googleapis.com"], link[href^="https://fonts.gstatic.com"]',
    ),
  ).toHaveCount(0);
  const notoFontCSS = await page.locator("style").evaluateAll((styles) =>
    styles.map((style) => style.textContent ?? "").find((css) => css.includes("--font-noto-sans-jp")),
  );
  expect(notoFontCSS).toMatch(/font-weight:\s*400 900/);
  await page.evaluate(() => document.fonts.ready);
  const fontResources = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((url) => url.endsWith(".woff2")),
  );
  expect(fontResources.length).toBeGreaterThan(0);
  const pageOrigin = new URL(page.url()).origin;
  expect(
    fontResources.every((url) => {
      const resourceURL = new URL(url);
      return resourceURL.origin === pageOrigin && resourceURL.pathname.startsWith("/_astro/fonts/");
    }),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((url) => /fonts\.(?:googleapis|gstatic)\.com/.test(url)),
    ),
  ).toEqual([]);

  await page.goto("/design-system/foundations#typography");
  await expect(
    page.getByText(
      "ヘッダーはsystem sans、本文と見出しはNoto Sans JP、コードとトークン名はJetBrains Monoを使用する。",
    ),
  ).toBeVisible();
  const codeFont = await page
    .locator("#typography code")
    .first()
    .evaluate((element) => getComputedStyle(element).fontFamily);
  expect(codeFont).toContain("JetBrains Mono");
});

test("11章と48項目を正規仕様として表示する", async ({ page }) => {
  const pageSpecifications = [
    {
      path: "/design-system/foundations",
      chapters: ["1. トークン", "2. レイアウト原則", "10. レスポンシブ・アクセシビリティ"],
      items: [
        "1-1. 色の役割", "1-2. 記事コールアウト色", "1-3. 文字階層", "1-4. 黄金比スペーシング", "1-5. 角丸・影",
        "2-1. ページシェル", "2-2. Gridの基本構造", "2-3. Grid breakpoints", "2-4. Grid types", "2-5. 配置パターン", "2-6. 幅トークン", "2-7. 余白の階層", "2-8. 見出しと強調の階層",
        "10-1. レスポンシブ規則", "10-2. キーボード・ARIA", "10-3. Motion / Loading",
      ],
    },
    {
      path: "/design-system/components",
      chapters: ["4. 基本部品", "5. ナビゲーション・検索部品", "6. ブログ固有部品"],
      items: [
        "4-1. Button", "4-2. Badge / Tag", "4-3. Card", "4-4. Input / TextLink / Kbd",
        "5-1. Header / Global Navigation", "5-2. SearchBox", "5-3. Command Palette", "5-4. Theme Toggle / Mobile Menu",
        "6-1. PageHero", "6-2. PostCard / PostMeta", "6-3. Table of Contents", "6-4. Scrapbox Card List",
      ],
    },
    {
      path: "/design-system/patterns",
      chapters: ["3. 状態の体系", "7. 記事コンテンツ", "8. ページの型"],
      items: [
        "3-1. 操作状態", "3-2. 非同期データの4状態", "3-3. 現在地と選択",
        "7-1. Markdown本文", "7-2. Callout", "7-3. Link Card", "7-4. Code Copy / Image",
        "8-1. ホーム", "8-2. 記事一覧", "8-3. 記事ページ", "8-4. 検索", "8-5. ポリシー・状態",
      ],
    },
    {
      path: "/design-system/content",
      chapters: ["9. UIライティング"],
      items: ["9-1. 声の性格", "9-2. 文言設計の6原則", "9-3. コンポーネント別の文法", "9-4. 表記", "9-5. 状態メッセージ"],
    },
    {
      path: "/design-system/governance",
      chapters: ["11. ガバナンス"],
      items: ["11-1. Source of Truth", "11-2. 適合ルール", "11-3. 更新方法"],
    },
  ];

  for (const specification of pageSpecifications) {
    await page.goto(specification.path);
    await expect(page.locator("main > section.spec > h2")).toHaveText(specification.chapters);
    await expect(page.locator("main > section.spec .spec-item > h3")).toHaveText(specification.items);
  }
  await expect(page.getByRole("heading", { name: "6-5. Knowledge Graph" })).toHaveCount(0);
});

test("デスクトップではセクションをサイドバーから移動できる", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/design-system/foundations");

  const sidebar = page.getByRole("complementary", {
    name: "デザインシステムの目次",
  });
  const navigation = sidebar.getByRole("navigation", {
    name: "デザインシステム",
  });

  await expect(sidebar).toBeVisible();
  await expect(sidebar).toHaveCSS("position", "sticky");
  await expect(navigation.getByRole("link", { name: "基盤", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(navigation.getByRole("link", { name: "カラー" })).toHaveAttribute(
    "href",
    "/design-system/foundations#color",
  );

  await navigation.getByRole("link", { name: "パターン", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "デザインシステム" }).getByRole("link", { name: "記事ページ" }),
  ).toHaveAttribute("href", "/design-system/patterns#article-reading");
});

test("サイドバーの現在位置はHeader currentと同じ表現で示す", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  const headerCurrentStyle = await page
    .getByRole("banner")
    .getByRole("link", { name: "Home", exact: true })
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        borderLeftWidth: style.borderLeftWidth,
        color: style.color,
        fontWeight: style.fontWeight,
      };
    });

  await page.goto("/design-system/foundations");

  const currentLink = page
    .getByRole("complementary", { name: "デザインシステムの目次" })
    .getByRole("link", { name: "基盤", exact: true });

  const currentStyle = await currentLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      borderLeftWidth: style.borderLeftWidth,
      color: style.color,
      fontWeight: style.fontWeight,
    };
  });

  expect(currentStyle).toEqual(headerCurrentStyle);
});

test("未定義の視覚表現は合意しデザインシステムへ定義してから使用する", async ({
  page,
}) => {
  await page.goto("/design-system/governance#conformance-rules");

  await expect(page.getByText("未定義の視覚表現を先に実装しない", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "新しい表現はオーナーと合意し、デザインシステムへ正規仕様として定義してから使用する。",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator("#update-method > .update-flow")).toHaveCount(0);
  await expect(page.locator("#update-method > .rule-list > li")).toHaveText([
    "変更理由と適用範囲をオーナーと合意する。",
    "合意した内容をデザインシステムへ正規仕様として定義する。",
    "正規ファイル・関連ガイド・実装・テストを同じ仕様へ揃える。",
  ]);
});

test("サイドバーの検索でセクションを絞り込める", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/design-system/foundations");

  const sidebar = page.getByRole("complementary", {
    name: "デザインシステムの目次",
  });
  await sidebar.getByRole("searchbox", { name: "セクションを検索" }).fill("タイポグラフィ");

  await expect(sidebar.getByRole("link", { name: "タイポグラフィ" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "カラー" })).toBeHidden();
});

test("サイドバーから記事ページの仕様へ移動できる", async ({ page }) => {
  await page.goto("/design-system/patterns#code-image");

  const articleReadingLink = page
    .getByRole("navigation", { name: "デザインシステム" })
    .getByRole("link", { name: "記事ページ", exact: true });

  await expect(articleReadingLink).toHaveAttribute(
    "href",
    "/design-system/patterns#article-reading",
  );
  await articleReadingLink.click();
  await expect(page).toHaveURL(/\/design-system\/patterns#article-reading$/);
  await expect(
    page.getByRole("heading", { level: 3, name: "8-3. 記事ページ" }),
  ).toBeVisible();
});

test("モバイルではサイドバーを折りたたみ目次として表示する", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-system");

  const sidebar = page.getByRole("complementary", {
    name: "デザインシステムの目次",
  });
  const toggle = sidebar.getByRole("button", { name: "デザインシステムの目次" });

  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(
    sidebar.getByRole("navigation", { name: "デザインシステム" }),
  ).toBeVisible();

  const viewport = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.innerWidth);
});

test("Tag interactionの正規仕様を実装された標本とともに表示する", async ({ page }) => {
  await page.goto("/design-system/components#badge");

  const specification = page.locator('[data-specification="tag-interaction"]');

  await expect(page.getByRole("heading", { name: "Tag interaction" })).toBeVisible();
  await expect(specification.locator('a[href="/tags/Astro"]')).toBeVisible();
  await expect(specification).toContainText("220ms");
  await expect(specification).toContainText("14deg");
  await expect(specification).toContainText("6%");
  await expect(specification).toContainText("prefers-reduced-motion");
});

test("記事ページの読書設計をパターンの共通レイアウト内に表示する", async ({
  page,
}) => {
  const response = await page.goto("/design-system/patterns#article-reading");

  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", { level: 1, name: "パターン" }),
  ).toBeVisible();
  await expect(page).toHaveTitle("パターン - KJR020's Blog デザインシステム");
  await expect(page.locator("body")).not.toContainText("Working Draft");
  await expect(page.locator(".book-intro > .draft-kicker")).toHaveCount(0);
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "KJR020's Blog" })).toHaveAttribute("href", "/");
  await expect(header.getByRole("link", { name: "Posts" })).toHaveAttribute("href", "/posts");
  await expect(header.getByRole("link", { name: /Search/ })).toHaveAttribute("href", "/search");
  await expect(header.getByRole("link", { name: /Scrapbox/ })).toHaveAttribute(
    "href",
    "https://scrapbox.io/kjr020/",
  );
  await expect(page.locator("body")).not.toContainText("DEV ONLY");
  await expect(page.locator("body")).not.toContainText("開発環境限定");
  await expect(header.getByText("DRAFT", { exact: true })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex,nofollow",
  );
  await expect(page.getByText("適用範囲", { exact: true })).toBeVisible();
  await expect(page.getByText("正規仕様ではありません")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "パターンへ戻る" })).toHaveCount(0);

  const sidebar = page.getByRole("complementary", {
    name: "デザインシステムの目次",
  });
  await expect(sidebar.getByRole("link", { name: "パターン", exact: true })).toHaveAttribute(
    "aria-current", "page",
  );
  await expect(sidebar.getByRole("link", { name: "記事ページ", exact: true })).toHaveAttribute(
    "href", "/design-system/patterns#article-reading",
  );
  await expect(
    sidebar.getByRole("button", { name: "パターンのセクションを開閉" }),
  ).toHaveAttribute("aria-expanded", "true");

  await expect(page.locator("#reading-model")).toBeVisible();
  await expect(page.locator("#reading-layout")).toBeVisible();
  await expect(page.locator("#reading-typography")).toBeVisible();
  await expect(page.locator("#figure-pattern")).toBeVisible();
  await expect(page.locator("#code-pattern")).toBeVisible();

  await expect(page.locator("[data-reading-lane]")).toBeVisible();
  await expect(page.locator("#figure-pattern figure img")).toHaveAttribute("width", "1078");
  await expect(page.locator("#figure-pattern figcaption")).toBeVisible();
  await expect(page.locator("#figure-pattern figcaption")).not.toContainText(/FIGURE \d+/);
  await expect(page.locator("#figure-pattern")).toContainText(
    "本文と同じ8 columnsへ揃える",
  );
  const imageTrigger = page
    .locator("#figure-pattern")
    .getByRole("link", { name: /画像を拡大/ });
  await imageTrigger.click();
  const imageDialog = page.getByRole("dialog", { name: "画像を拡大表示" });
  await expect(imageDialog).toBeVisible();
  await imageDialog.getByRole("button", { name: "拡大表示を閉じる" }).click();
  await expect(imageTrigger).toBeFocused();
  await expect(page.locator("#code-pattern pre")).toHaveAttribute("tabindex", "0");
  await expect(
    page.locator("#code-pattern").getByRole("button", { name: "コードをコピー" }),
  ).toBeVisible();
});

test("記事ページの仕様はモバイルで横溢れしない", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-system/patterns#article-reading");

  const viewport = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.innerWidth);
  await expect(page.locator("#code-pattern pre")).toHaveCSS("overflow-x", "auto");
});

test("コード標本はコピー完了をテキストで通知する", async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/design-system/patterns#code-pattern");

  const specimen = page.locator("#code-pattern");
  await specimen.getByRole("button", { name: "コードをコピー" }).click();

  await expect(specimen.locator("[data-copy-status]")).toHaveText("コードをコピーしました");
  await expect(specimen.getByRole("button", { name: "コピーしました" })).toBeFocused();
});

test("記事ページの仕様は他の仕様項目と同じ見出し・説明・標本の反復で表示する", async ({ page }) => {
  await page.goto("/design-system/patterns#article-reading");

  const sections = page.locator("#article-reading > .article-reading-section");

  await expect(sections).toHaveCount(5);
  await expect(sections.locator(":scope > h4")).toHaveText([
    "Content model",
    "Layout",
    "Typography",
    "Figure",
    "Code example",
  ]);
  await expect(sections.locator(":scope > p.src")).toHaveCount(5);
  await expect(sections.locator(":scope > .demo")).toHaveCount(5);
  await expect(page.locator("#article-reading .section-heading")).toHaveCount(0);
  await expect(page.locator("#article-reading .section-lead")).toHaveCount(0);
  await expect(page.locator("#decision-log")).toHaveCount(0);
  await expect(page.locator(".type-candidate")).toHaveCount(1);
  await expect(page.locator("main")).not.toContainText("COMPARE");
  await expect(page.locator("main")).not.toContainText("PROPOSED");
  await expect(page.locator("main")).not.toContainText("レビュー順");
  await expect(page.locator("main")).not.toContainText("現行実装から確認すること");
});

test("コード標本は記事のコード面を踏襲し言語だけを追加表示する", async ({ page }) => {
  await page.goto("/design-system/patterns", { waitUntil: "networkidle" });

  const specimen = page.locator("#code-pattern > .article-code-example");
  const code = specimen.locator("pre");
  const copyButton = specimen.getByRole("button", { name: "コードをコピー" });

  await expect(specimen.getByText("TypeScript", { exact: true })).toHaveAttribute(
    "aria-label",
    "コードの言語",
  );
  await expect(specimen.locator(".code-toolbar")).toHaveCount(0);
  await expect(code).toHaveClass(/\bastro-code\b/);
  await expect(code).toHaveAttribute("data-language", "typescript");
  await expect(copyButton.locator("svg")).toHaveCount(1);
  await expect(copyButton).not.toHaveText("コードをコピー");

  const codeStyle = await code.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderTopWidth: style.borderTopWidth,
      borderRadius: style.borderRadius,
      overflowX: style.overflowX,
    };
  });

  expect(codeStyle.backgroundColor).toBe("rgb(246, 248, 250)");
  expect(codeStyle.borderTopWidth).toBe("0px");
  expect(Number.parseFloat(codeStyle.borderRadius)).toBeGreaterThan(0);
  expect(codeStyle.overflowX).toBe("auto");

  const canHover = await page.evaluate(() => window.matchMedia("(hover: hover)").matches);
  if (canHover) {
    await expect(copyButton).toHaveCSS("opacity", "0");
    await specimen.locator(".code-block-wrapper").hover();
    await expect(copyButton).toHaveCSS("opacity", "1");
  } else {
    await expect(copyButton).toHaveCSS("opacity", "1");
  }

  await page.locator("html").evaluate((element) => element.classList.add("dark"));
  await expect(code).toHaveCSS("background-color", "rgb(36, 41, 46)");
});

test("本文標本はデザインシステムの標準面を使用する", async ({ page }) => {
  await page.goto("/design-system/patterns#reading-typography");

  const bodySpecimen = page.locator("#reading-typography .type-candidate");

  await expect(bodySpecimen).toHaveClass(/\bdemo\b/);
  await expect(bodySpecimen).not.toHaveClass(/\btype-standard\b/);
});
