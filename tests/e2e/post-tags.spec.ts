import { expect, type Page, test } from "playwright/test";

function getAstroTag(page: Page) {
  return page.locator('a.tag-link[href="/tags/Astro"]').first();
}

async function resolveColor(page: Page, value: string) {
  return page.evaluate((cssValue) => {
    const probe = document.createElement("span");
    probe.style.color = cssValue;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, value);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/__test/posts");
});

test("記事タグはHoverしなくても輪郭でリンクと分かる", async ({ page }) => {
  const tag = getAstroTag(page);

  await expect(tag).toHaveCSS("border-top-style", "solid");
  await expect(tag).toHaveCSS("border-top-color", await resolveColor(page, "var(--border)"));
  await expect(tag).toContainText("#");
});

test("記事タグはHoverするとBrandの輪郭と文字色になる", async ({ page }) => {
  const tag = getAstroTag(page);
  const brand = await resolveColor(page, "var(--brand)");

  await tag.hover();

  await expect(tag).toHaveCSS("color", brand);
  await expect(tag).toHaveCSS("border-top-color", brand);
});

test("記事タグ上では記事行のHover表現を重ねない", async ({ page }) => {
  const tag = getAstroTag(page);
  const row = tag.locator("xpath=ancestor::article[contains(@class, 'post-row')]");
  const title = row.locator(".post-row__title-text");

  await page.getByRole("heading", { level: 1, name: "Posts" }).hover();
  const restingColor = await title.evaluate((element) => getComputedStyle(element).color);

  await tag.hover();
  await page.waitForTimeout(300);

  await expect(title).toHaveCSS("color", restingColor);
  await expect(title).toHaveCSS("background-size", "0% 1px");
});

test("記事行は行全体を記事へのリンクにし、タグは別のリンクとして操作できる", async ({ page }) => {
  const tag = getAstroTag(page);
  const row = tag.locator("xpath=ancestor::article[contains(@class, 'post-row')]");
  const titleLink = row.locator(".post-row__link");

  await expect(titleLink).toHaveAttribute("href", /^\/posts\//);

  await tag.click();
  await expect(page).toHaveURL(/\/tags\/Astro\/?$/);
});

test("記事タグはキーボードフォーカスで輪郭線を表示する", async ({ page }) => {
  const tag = getAstroTag(page);

  await tag.focus();

  await expect(tag).toHaveCSS("outline-style", "solid");
  await expect(tag).toHaveCSS("color", await resolveColor(page, "var(--brand)"));
});
