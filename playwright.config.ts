import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/design-system.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  snapshotPathTemplate:
    "{testDir}/{testFileDir}/{testFileName}-snapshots/{projectName}/{arg}-{platform}{ext}",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.005,
      animations: "disabled",
      stylePath: "./e2e/snapshot.css",
    },
  },
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "pnpm build:test && pnpm preview --host localhost --port 4321",
    url: "http://localhost:4321/__test/home",
    timeout: 180_000,
    reuseExistingServer: false,
  },
});
