import { afterEach, describe, expect, it, vi } from "vitest";

import { devDesignSystem } from "@/integrations/devDesignSystem";

type InjectedRoute = {
  entrypoint: URL | string;
  pattern: string;
};

type SetupHook = (options: {
  command: "build" | "dev" | "preview" | "sync";
  injectRoute: (route: InjectedRoute) => void;
}) => Promise<void> | void;

function getDesignSystemSetupHook(): SetupHook {
  const integration = devDesignSystem();

  expect(integration.name).toBe("kjr020:dev-design-system");

  return integration.hooks["astro:config:setup"] as unknown as SetupHook;
}

describe("devDesignSystem integration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("開発サーバーではデザインシステムとテストfixtureのルートを注入する", async () => {
    const injectRoute = vi.fn<(route: InjectedRoute) => void>();

    await getDesignSystemSetupHook()({ command: "dev", injectRoute });

    expect(injectRoute.mock.calls.map(([route]) => route.pattern)).toEqual([
      "/design-system",
      "/design-system/foundations",
      "/design-system/components",
      "/design-system/patterns",
      "/design-system/content",
      "/design-system/governance",
      "/design-system/patterns/article-reading",
      "/design-system/article-reading",
      "/__test/home",
      "/__test/posts",
      "/__test/search",
      "/__test/404",
    ]);
  });

  it.each(["build", "preview", "sync"] as const)("%s ではルートを注入しない", async (command) => {
    const injectRoute = vi.fn<(route: InjectedRoute) => void>();

    await getDesignSystemSetupHook()({ command, injectRoute });

    expect(injectRoute).not.toHaveBeenCalled();
  });

  it("テストfixtureを有効にしたビルドではfixtureルートだけを注入する", async () => {
    vi.stubEnv("TEST_FIXTURES", "true");
    const injectRoute = vi.fn<(route: InjectedRoute) => void>();

    await getDesignSystemSetupHook()({ command: "build", injectRoute });

    expect(injectRoute.mock.calls.map(([route]) => route.pattern)).toEqual([
      "/__test/home",
      "/__test/posts",
      "/__test/search",
      "/__test/404",
    ]);
  });
});
