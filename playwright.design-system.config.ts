import { defineConfig, devices } from "playwright/test";

const port = process.env.DESIGN_SYSTEM_PORT ?? "4321";

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["design-system.spec.ts", "post-tags.spec.ts"],
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm dev --host 127.0.0.1 --port ${port}`,
    // Astro 7 automatically detaches its dev server in agentic environments.
    // Playwright needs the command to stay in the foreground so it can manage
    // the server lifecycle itself.
    env: {
      ASTRO_DEV_BACKGROUND: "1",
      LINK_CARD_FETCH_MODE: "offline",
    },
    url: `http://127.0.0.1:${port}/design-system`,
    reuseExistingServer: !process.env.CI,
  },
});
