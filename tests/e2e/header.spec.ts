import { expect, test } from "playwright/test";

test.describe("モバイルビューポートでのメニュー動作", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("768px未満でハンバーガーメニューが表示される", async ({ page }) => {
    await page.goto("/__test/home");

    // Astro Islandのハイドレーション完了を待機
    await page.waitForSelector("astro-island[client='load']:not([ssr])");

    const hamburgerButton = page.getByRole("button", { name: /メニューを開く/ });
    await expect(hamburgerButton).toBeVisible();
  });

  test("メニュー開閉が正しく動作する", async ({ page }) => {
    await page.goto("/__test/home");
    await page.waitForSelector("astro-island[client='load']:not([ssr])");

    const menuButton = page.getByRole("button", {
      name: /メニューを(開く|閉じる)/,
    });
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");

    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(menuButton).toHaveAttribute("aria-label", "メニューを閉じる");

    // モバイルメニュー内のリンクを確認
    const mobileNav = page.locator("astro-island nav");
    const homeLink = mobileNav.getByRole("link", { name: "Home" });
    await expect(homeLink).toBeVisible();

    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });

  test("リンククリック後にメニューが閉じる", async ({ page }) => {
    await page.goto("/__test/home");
    await page.waitForSelector("astro-island[client='load']:not([ssr])");

    const menuButton = page.getByRole("button", {
      name: /メニューを(開く|閉じる)/,
    });
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");

    // モバイルメニュー内のPostsリンク
    const mobileNav = page.locator("astro-island nav");
    const postsLink = mobileNav.getByRole("link", { name: "Posts" });
    await postsLink.click();

    await page.waitForURL(/\/posts/);
    await page.waitForSelector("astro-island[client='load']:not([ssr])");
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });

  test("Escapeキーでメニューが閉じる", async ({ page }) => {
    await page.goto("/__test/home");
    await page.waitForSelector("astro-island[client='load']:not([ssr])");

    const menuButton = page.getByRole("button", {
      name: /メニューを(開く|閉じる)/,
    });
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });

  test("メニュー外クリックでメニューが閉じる", async ({ page }) => {
    await page.goto("/__test/home");
    await page.waitForSelector("astro-island[client='load']:not([ssr])");

    const menuButton = page.getByRole("button", {
      name: /メニューを(開く|閉じる)/,
    });
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");

    await page.locator("main").first().click({ force: true });
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("デスクトップビューポートでの表示", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("768px以上で水平ナビゲーションが表示される", async ({ page }) => {
    await page.goto("/__test/home");

    // ヘッダー内のデスクトップナビゲーションを確認
    const header = page.locator("header");
    const desktopNav = header.locator("nav");
    await expect(desktopNav).toBeVisible();

    const homeLink = desktopNav.getByRole("link", { name: "Home" });
    await expect(homeLink).toBeVisible();
    const postsLink = desktopNav.getByRole("link", { name: "Posts" });
    await expect(postsLink).toBeVisible();
  });

  test("ハンバーガーメニューが非表示", async ({ page }) => {
    await page.goto("/__test/home");

    // MobileMenuコンポーネントのハンバーガーボタンがデスクトップでは非表示
    const menuButton = page.getByRole("button", { name: /メニューを開く/ });
    await expect(menuButton).toBeHidden();
  });

  test("既存のナビゲーション動作が正常", async ({ page }) => {
    await page.goto("/__test/home");

    const header = page.locator("header");
    const postsLink = header.locator("nav").getByRole("link", { name: "Posts" });
    await postsLink.click();

    await expect(page).toHaveURL(/\/posts/);
  });
});
