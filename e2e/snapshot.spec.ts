import { expect, type Page, test } from "playwright/test";
import type { ScrapboxPageData } from "../src/components/scrapbox/types";
import type { PageConfig } from "./helpers/snapshot";
import { capturePageSnapshot } from "./helpers/snapshot";

const scrapboxPages: ScrapboxPageData[] = [
  {
    id: "astro-blog-notes",
    title: "Astroブログのメモ",
    imageUrl: null,
    description: "Astroで調べたことや試したことのメモ。",
    updatedAt: "2026-03-10T12:00:00.000Z",
    url: "https://scrapbox.io/KJR020/Astroブログのメモ",
  },
  {
    id: "playwright-snapshots",
    title: "Playwrightのスナップショット",
    imageUrl: null,
    description: "画像比較を安定させるために確認したこと。",
    updatedAt: "2026-02-24T12:00:00.000Z",
    url: "https://scrapbox.io/KJR020/Playwrightのスナップショット",
  },
  {
    id: "web-development-notes",
    title: "Web開発の調べもの",
    imageUrl: null,
    description: "日々の開発で気になったことを残しています。",
    updatedAt: "2026-01-18T12:00:00.000Z",
    url: "https://scrapbox.io/KJR020/Web開発の調べもの",
  },
];

async function mockScrapboxApi(page: Page): Promise<void> {
  await page.route(/\/api\/pages\/KJR020(?:\?.*)?$/, async (route) => {
    await route.fulfill({ json: scrapboxPages });
  });
}

const staticPages: PageConfig[] = [
  { route: "/", name: "index", hasIslands: true },
  { route: "/posts", name: "posts", hasIslands: true },
  { route: "/404", name: "404", hasIslands: false },
];

const dynamicPages: PageConfig[] = [
  {
    route: "/posts/terraform/terraform入門した",
    name: "post-detail",
    hasIslands: true,
  },
  { route: "/tags/DbC", name: "tag-list", hasIslands: true },
];

const themes = ["light", "dark"] as const;

test("スナップショット用CSSでAstro Dev Toolbarを非表示にする", async ({
  page,
}) => {
  await page.setContent("<astro-dev-toolbar>Toolbar</astro-dev-toolbar>");
  await page.addStyleTag({ path: "e2e/snapshot.css" });

  await expect(page.locator("astro-dev-toolbar")).toBeHidden();
});

test.describe("静的ページのスナップショット", () => {
  for (const pageConfig of staticPages) {
    for (const theme of themes) {
      test(`${pageConfig.name} - ${theme}`, async ({ page }) => {
        if (pageConfig.route === "/") {
          await mockScrapboxApi(page);
        }

        await capturePageSnapshot(page, {
          config: pageConfig,
          theme,
          snapshotName: `${pageConfig.name}-${theme}`,
        });
      });
    }
  }
});

test.describe("動的ページのスナップショット", () => {
  for (const pageConfig of dynamicPages) {
    for (const theme of themes) {
      test(`${pageConfig.name} - ${theme}`, async ({ page }) => {
        const mask =
          pageConfig.name === "post-detail"
            ? [page.locator(".giscus")]
            : undefined;

        await capturePageSnapshot(page, {
          config: pageConfig,
          theme,
          snapshotName: `${pageConfig.name}-${theme}`,
          mask,
        });
      });
    }
  }
});
