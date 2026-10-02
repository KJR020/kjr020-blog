import { afterEach, describe, expect, it, vi } from "vitest";

import { injectedRoutes } from "@/integrations/injectedRoutes";

type InjectedRoute = {
  entrypoint: URL | string;
  pattern: string;
};

type SetupHook = (options: {
  command: "build" | "dev" | "preview" | "sync";
  injectRoute: (route: InjectedRoute) => void;
}) => Promise<void> | void;

const designSystemPatterns = [
  "/design-system",
  "/design-system/foundations",
  "/design-system/components",
  "/design-system/patterns",
  "/design-system/content",
  "/design-system/governance",
  "/design-system/patterns/article-reading",
  "/design-system/article-reading",
];

const testFixturePatterns = ["/__test/home", "/__test/posts", "/__test/404"];

function getSetupHook(): SetupHook {
  const integration = injectedRoutes();

  expect(integration.name).toBe("kjr020:injected-routes");

  return integration.hooks["astro:config:setup"] as unknown as SetupHook;
}

async function injectedPatterns(command: Parameters<SetupHook>[0]["command"]) {
  const injectRoute = vi.fn<(route: InjectedRoute) => void>();

  await getSetupHook()({ command, injectRoute });

  return injectRoute.mock.calls.map(([route]) => route.pattern);
}

describe("injectedRoutes integration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("デザインシステム", () => {
    it.each([
      "build",
      "dev",
      "preview",
      "sync",
    ] as const)("%s で6ページと旧URLの転送ページを注入する", async (command) => {
      const patterns = await injectedPatterns(command);

      expect(patterns.filter((pattern) => pattern.startsWith("/design-system"))).toEqual(
        designSystemPatterns,
      );
    });
  });

  describe("テストfixture", () => {
    it("開発サーバーでは注入する", async () => {
      expect(await injectedPatterns("dev")).toEqual([
        ...designSystemPatterns,
        ...testFixturePatterns,
      ]);
    });

    it.each(["build", "preview", "sync"] as const)("%s では注入しない", async (command) => {
      expect(await injectedPatterns(command)).toEqual(designSystemPatterns);
    });

    it("TEST_FIXTURES=true のビルドでは注入する", async () => {
      vi.stubEnv("TEST_FIXTURES", "true");

      expect(await injectedPatterns("build")).toEqual([
        ...designSystemPatterns,
        ...testFixturePatterns,
      ]);
    });

    it.each(["false", "1", ""])("TEST_FIXTURES=%j のビルドでは注入しない", async (value) => {
      vi.stubEnv("TEST_FIXTURES", value);

      expect(await injectedPatterns("build")).toEqual(designSystemPatterns);
    });
  });
});
