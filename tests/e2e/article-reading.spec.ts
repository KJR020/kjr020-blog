import { expect, test } from "playwright/test";

const articlePath = "/posts/__test/article";

test("画面幅に応じた本文組版を使う", async ({ page }, testInfo) => {
  await page.goto(articlePath);

  const content = page.locator(".article-reading-content");
  const paragraph = content.locator(":scope > p").first();
  const typography = await paragraph.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      fontSize: Number.parseFloat(style.fontSize),
      lineHeight: Number.parseFloat(style.lineHeight),
      width: element.getBoundingClientRect().width,
    };
  });

  const isCompact = testInfo.project.name === "Mobile Chrome";
  const expectedFontSize = isCompact ? 16 : 17;
  const expectedLineHeight = isCompact ? 1.9 : 2;

  expect(typography.fontSize).toBe(expectedFontSize);
  expect(typography.lineHeight / typography.fontSize).toBeCloseTo(expectedLineHeight, 1);
  expect(typography.width).toBeLessThanOrEqual(expectedFontSize * 40 + 1);
});

test("Figureを本文と同じReading laneへ揃える", async ({ page }, testInfo) => {
  await page.goto(articlePath);

  const content = page.locator(".article-reading-content");
  const paragraph = content.locator(":scope > p").first();
  const figure = content.locator("figure.article-figure").last();

  await expect(figure.locator("figcaption")).toContainText("画像を拡大表示できる");
  await expect(figure.locator("figcaption")).not.toContainText(/FIGURE \d+/);

  if (testInfo.project.name === "chromium") {
    const [paragraphBox, figureBox] = await Promise.all([
      paragraph.boundingBox(),
      figure.boundingBox(),
    ]);
    expect(figureBox?.width).toBeCloseTo(paragraphBox?.width ?? 0, 0);
  }
});

test("Mermaid図を本文と同じReading laneへ揃える", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto(articlePath);

  const content = page.locator(".article-reading-content");
  const paragraph = content.locator(":scope > p").first();
  await content.evaluate((element) => {
    const diagram = document.createElement("div");
    diagram.className = "mermaid";
    diagram.textContent = "Types → Config → Repo → Service → Runtime → UI";
    element.append(diagram);
  });

  const [paragraphBox, diagramBox] = await Promise.all([
    paragraph.boundingBox(),
    content.locator(":scope > .mermaid").boundingBox(),
  ]);
  expect(diagramBox?.width).toBeCloseTo(paragraphBox?.width ?? 0, 0);
});

test("768pxからMediumの本文組版へ切り替える", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto(articlePath);

  const content = page.locator(".article-reading-content");
  const paragraph = content.locator(":scope > p").first();
  const [contentBox, paragraphBox] = await Promise.all([
    content.boundingBox(),
    paragraph.boundingBox(),
  ]);
  const fontSize = await paragraph.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize),
  );

  expect(fontSize).toBe(17);
  expect(paragraphBox?.width).toBeLessThan(contentBox?.width ?? 0);
});

test("デスクトップでは記事ヘッダーの下に本文と目次を並べる", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(articlePath);

  const article = page.getByRole("article");
  const header = article.locator(":scope > header");
  const readingLayout = article.locator(":scope > .post-reading-layout");
  const main = readingLayout.locator(":scope > .post-reading-main");
  const desktopToc = readingLayout.locator(":scope > aside");

  await expect(readingLayout).toBeVisible();
  const [headerBox, layoutBox, mainBox, tocBox] = await Promise.all([
    header.boundingBox(),
    readingLayout.boundingBox(),
    main.boundingBox(),
    desktopToc.boundingBox(),
  ]);

  expect(headerBox).not.toBeNull();
  expect(layoutBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  expect(tocBox).not.toBeNull();
  expect(headerBox?.x).toBeCloseTo(layoutBox?.x ?? 0, 0);
  expect(headerBox?.width).toBeCloseTo(layoutBox?.width ?? 0, 0);
  expect(layoutBox?.y ?? 0).toBeGreaterThanOrEqual((headerBox?.y ?? 0) + (headerBox?.height ?? 0));
  expect(tocBox?.x ?? 0).toBeGreaterThan((mainBox?.x ?? 0) + (mainBox?.width ?? 0));
});

test("デスクトップでは記事タイトルをキャラクター領域に重ねない", async ({ page }) => {
  await page.setViewportSize({ width: 1051, height: 900 });
  await page.goto(articlePath);

  const title = page.getByRole("heading", { level: 1 });
  const character = page.locator(".kuri-watermark");
  const [titleBox, characterBox] = await Promise.all([
    title.boundingBox(),
    character.boundingBox(),
  ]);

  expect(titleBox).not.toBeNull();
  expect(characterBox).not.toBeNull();
  expect(titleBox?.x ?? 0).toBeLessThan(characterBox?.x ?? 0);
  expect((titleBox?.x ?? 0) + (titleBox?.width ?? 0)).toBeLessThanOrEqual(characterBox?.x ?? 0);
});

test("モバイルでは記事ヘッダー直後に折りたたみ目次を表示する", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(articlePath);

  const article = page.getByRole("article");
  const mobileToc = article.locator(".post-mobile-toc");
  const trigger = mobileToc.getByRole("button", { name: "目次を開く" });

  await expect(page.locator(".kuri-watermark")).toBeHidden();
  await expect(mobileToc).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(mobileToc.getByRole("navigation", { name: "目次" })).toBeVisible();
  await expect(mobileToc.getByRole("button", { name: "目次を閉じる" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(article.locator("header + .post-mobile-toc")).toBeVisible();
});

test("デスクトップでは目次を隠して再表示できる", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(articlePath);

  const readingMain = page.locator(".post-reading-main");
  const paragraph = page.locator(".article-reading-content > p").first();
  const desktopToc = page.locator(".post-desktop-toc");
  const navigation = desktopToc.getByRole("navigation", { name: "目次" });
  const initialReadingMainWidth = (await readingMain.boundingBox())?.width ?? 0;
  const initialParagraphWidth = (await paragraph.boundingBox())?.width ?? 0;

  await expect(desktopToc.locator("astro-island:not([ssr])")).toBeAttached();
  await expect(navigation).toBeVisible();
  await desktopToc.getByRole("button", { name: "目次を隠す" }).click();
  await expect(navigation).toBeHidden();
  await expect
    .poll(async () => (await readingMain.boundingBox())?.width ?? 0)
    .toBeGreaterThan(initialReadingMainWidth + 180);
  await expect
    .poll(async () => (await paragraph.boundingBox())?.width ?? 0)
    .toBeGreaterThan(initialParagraphWidth + 100);

  await desktopToc.getByRole("button", { name: "目次を表示" }).click();
  await expect(navigation).toBeVisible();
  await expect
    .poll(async () => (await readingMain.boundingBox())?.width ?? 0)
    .toBe(initialReadingMainWidth);
  await expect
    .poll(async () => (await paragraph.boundingBox())?.width ?? 0)
    .toBe(initialParagraphWidth);
});

test("デスクトップ目次の現在位置アイコンをスクロール領域内に表示する", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(articlePath);

  const desktopToc = page.locator(".post-desktop-toc");
  const navigation = desktopToc.getByRole("navigation", { name: "目次" });
  const currentLocationIcon = desktopToc.getByRole("img", { name: "KJR020" });
  const [navigationBox, iconBox] = await Promise.all([
    navigation.boundingBox(),
    currentLocationIcon.boundingBox(),
  ]);

  expect(navigationBox).not.toBeNull();
  expect(iconBox).not.toBeNull();
  expect(iconBox?.x ?? 0).toBeGreaterThanOrEqual(navigationBox?.x ?? 0);
  expect((iconBox?.x ?? 0) + (iconBox?.width ?? 0)).toBeLessThanOrEqual(
    (navigationBox?.x ?? 0) + (navigationBox?.width ?? 0),
  );
});

test("デスクトップ目次はページをスクロールしても画面内に追従する", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(articlePath);

  const desktopToc = page.locator(".post-desktop-toc [data-desktop-toc-open]");
  await expect(desktopToc).toBeVisible();

  await page.mouse.wheel(0, 1_200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1_000);

  const firstScrolledTop = (await desktopToc.boundingBox())?.y;
  expect(firstScrolledTop).toBeCloseTo(96, 0);

  await page.mouse.wheel(0, 1_200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(2_000);

  const secondScrolledTop = (await desktopToc.boundingBox())?.y;
  expect(secondScrolledTop).toBeCloseTo(firstScrolledTop ?? 0, 0);
});

test("本文をスクロールすると現在の見出しへ目次マーカーが移動する", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(articlePath);

  const targetHeading = page.getByRole("heading", { name: "構造レイヤー" });
  const targetTop = (await targetHeading.boundingBox())?.y;
  expect(targetTop).toBeDefined();

  await page.mouse.wheel(0, (targetTop ?? 0) - 96);
  await expect
    .poll(() => targetHeading.boundingBox().then((box) => box?.y ?? 0))
    .toBeCloseTo(96, 0);

  const currentHeading = page.locator(".post-desktop-toc").locator('[aria-current="location"]');
  await expect(currentHeading).toHaveText("構造レイヤー");
});

test("見出しへの直接リンクを開いても目次の更新でページ上部へ戻らない", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${articlePath}#表層レイヤー`);

  const heading = page.getByRole("heading", { name: "表層レイヤー" });
  await page.waitForTimeout(1_000);

  await expect(heading).toBeInViewport();
});

test("記事画像を拡大表示し、閉じると画像リンクへフォーカスを戻す", async ({ page }) => {
  await page.goto(articlePath);

  const viewportWidths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(viewportWidths.scroll).toBe(viewportWidths.client);

  const trigger = page.getByRole("link", { name: "画像を拡大: テスト画像" });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "画像を拡大表示" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("img")).toHaveAttribute("src", "/images/kuri_photo.png");

  await dialog.getByRole("button", { name: "拡大表示を閉じる" }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("画像拡大パネルをビューポート中央に表示する", async ({ page }) => {
  await page.goto(articlePath);

  await page.getByRole("link", { name: "画像を拡大: テスト画像" }).click();

  const dialog = page.getByRole("dialog", { name: "画像を拡大表示" });
  await expect(dialog.locator("img")).toHaveJSProperty("naturalWidth", 500);
  const [dialogBox, viewport] = await Promise.all([
    dialog.boundingBox(),
    page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;inline-size:100dvw;block-size:100dvh;visibility:hidden;pointer-events:none";
      document.body.append(probe);
      const box = probe.getBoundingClientRect();
      probe.remove();
      return {
        width: window.innerWidth,
        height: box.height - (window.visualViewport?.offsetTop ?? 0),
      };
    }),
  ]);

  expect(dialogBox).not.toBeNull();
  if (!dialogBox) return;

  expect(dialogBox.x + dialogBox.width / 2).toBeCloseTo(viewport.width / 2, 0);
  expect(dialogBox.y + dialogBox.height / 2).toBeCloseTo(viewport.height / 2, 0);
});

test("コード言語を表示し、コピー結果をテキストで通知する", async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(articlePath);

  const code = page.locator('.article-code-example:has(pre[data-language="typescript"])').first();
  await expect(code.getByText("TypeScript", { exact: true })).toHaveAttribute(
    "aria-label",
    "コードの言語",
  );

  const copyButton = code.locator(".copy-button");
  await expect(copyButton).toHaveAttribute("aria-label", "コードをコピー");
  await copyButton.click();

  await expect(code.locator('[aria-live="polite"]')).toHaveText("コードをコピーしました");
  await expect(copyButton).toHaveAttribute("aria-label", "コピーしました");
});
