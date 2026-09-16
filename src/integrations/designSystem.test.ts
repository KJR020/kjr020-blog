import { describe, expect, it, vi } from "vitest";

import { designSystem } from "./designSystem";

type InjectedRoute = {
  entrypoint: URL | string;
  pattern: string;
};

type SetupHook = (options: {
  command: "build" | "dev" | "preview" | "sync";
  injectRoute: (route: InjectedRoute) => void;
}) => Promise<void> | void;

function getDesignSystemSetupHook(): SetupHook {
  const integration = designSystem();

  expect(integration.name).toBe("kjr020:design-system");

  return integration.hooks["astro:config:setup"] as unknown as SetupHook;
}

describe("designSystem integration", () => {
  it.each([
    "build",
    "dev",
    "preview",
    "sync",
  ] as const)("%s で6つのデザインシステムページと互換ルートを注入する", async (command) => {
    const injectRoute = vi.fn<(route: InjectedRoute) => void>();

    await getDesignSystemSetupHook()({ command, injectRoute });

    expect(injectRoute.mock.calls.map(([route]) => route.pattern)).toEqual([
      "/design-system",
      "/design-system/foundations",
      "/design-system/components",
      "/design-system/patterns",
      "/design-system/content",
      "/design-system/governance",
      "/design-system/patterns/article-reading",
      "/design-system/article-reading",
    ]);
  });
});
