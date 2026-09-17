import { expect, test } from "playwright/test";
import type { PageConfig } from "./helpers/snapshot";
import { capturePageSnapshot } from "./helpers/snapshot";

const fixturePages: PageConfig[] = [
  { route: "/__vrt/home", name: "index", hasIslands: true },
  { route: "/__vrt/posts", name: "posts", hasIslands: true },
  { route: "/__vrt/search", name: "search", hasIslands: true },
  { route: "/__vrt/404", name: "404", hasIslands: true },
];

const themes = ["light", "dark"] as const;

test("スナップショット用CSSでAstro Dev Toolbarを非表示にする", async ({
  page,
}) => {
  await page.setContent("<astro-dev-toolbar>Toolbar</astro-dev-toolbar>");
  await page.addStyleTag({ path: "e2e/snapshot.css" });

  await expect(page.locator("astro-dev-toolbar")).toBeHidden();
});

test.describe("固定fixtureページのスナップショット", () => {
  for (const pageConfig of fixturePages) {
    for (const theme of themes) {
      test(`${pageConfig.name} - ${theme}`, async ({ page }) => {
        await capturePageSnapshot(page, {
          config: pageConfig,
          theme,
          snapshotName: `${pageConfig.name}-${theme}`,
        });
      });
    }
  }
});
