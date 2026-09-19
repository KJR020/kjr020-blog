import { expect, type Page, test } from "playwright/test";

function getAstroTag(page: Page) {
  return page.locator('a[href="/tags/Astro"]').first();
}

async function getLinkColor(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--link)";
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/__test/posts");
});

test("記事タグはホバーするとRender面を表示してリンク色になる", async ({ page }) => {
  const tag = getAstroTag(page);
  const label = tag.locator('[data-slot="badge"]');
  const initialTransform = await tag.evaluate(
    (element) => getComputedStyle(element, "::before").transform,
  );

  await tag.hover();

  await expect(label).toHaveCSS("color", await getLinkColor(page));
  await expect
    .poll(() => tag.evaluate((element) => getComputedStyle(element, "::before").transform))
    .not.toBe(initialTransform);
  await expect
    .poll(() => tag.evaluate((element) => getComputedStyle(element, "::before").transitionDuration))
    .toBe("0.22s");
});

test("記事タグ上では記事カードのホバー表現を重ねない", async ({ page }) => {
  const tag = getAstroTag(page);
  const card = tag.locator("xpath=ancestor::*[@data-slot='card']");
  const title = card.locator('[data-slot="card-title"]');

  await page.getByRole("heading", { level: 1, name: "Posts" }).hover();
  const restingStyle = await card.evaluate((element) => ({
    backgroundColor: getComputedStyle(element).backgroundColor,
    titleColor: getComputedStyle(element.querySelector('[data-slot="card-title"]') as Element)
      .color,
  }));

  await tag.hover();
  await page.waitForTimeout(250);

  await expect(card).toHaveCSS("background-color", restingStyle.backgroundColor);
  await expect(title).toHaveCSS("color", restingStyle.titleColor);
});

test("記事タグはキーボードフォーカスでもRender面とリンク色を表示する", async ({ page }) => {
  const tag = getAstroTag(page);
  const label = tag.locator('[data-slot="badge"]');
  const initialTransform = await tag.evaluate(
    (element) => getComputedStyle(element, "::before").transform,
  );

  await tag.focus();

  await expect(label).toHaveCSS("color", await getLinkColor(page));
  await expect
    .poll(() => tag.evaluate((element) => getComputedStyle(element, "::before").transform))
    .not.toBe(initialTransform);
});

test("動きを減らす設定では記事タグの遷移時間をなくす", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();

  const tag = getAstroTag(page);
  await tag.hover();

  await expect
    .poll(() => tag.evaluate((element) => getComputedStyle(element, "::before").content))
    .toBe('""');
  await expect
    .poll(() => tag.evaluate((element) => getComputedStyle(element, "::before").transform))
    .not.toBe("none");
  await expect
    .poll(() => tag.evaluate((element) => getComputedStyle(element, "::before").transitionDuration))
    .toBe("0s");
});
