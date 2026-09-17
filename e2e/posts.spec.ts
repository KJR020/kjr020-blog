import { expect, test } from "playwright/test";

test("Posts のフッターは記事一覧の後に表示される", async ({ page }) => {
  await page.goto("/__test/posts");

  const footer = page.locator("footer");
  const footerAtPageTop = await footer.boundingBox();
  const viewportHeight = page.viewportSize()?.height ?? 0;

  expect(footerAtPageTop).not.toBeNull();
  expect(footerAtPageTop?.y).toBeGreaterThanOrEqual(viewportHeight);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

  await expect(footer).toBeInViewport();
});
