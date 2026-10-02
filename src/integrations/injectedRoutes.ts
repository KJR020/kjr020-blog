import type { AstroIntegration } from "astro";

type RouteDefinition = {
  pattern: string;
  /** このファイルからの相対パス */
  entrypoint: string;
};

const DESIGN_SYSTEM_ROUTES: readonly RouteDefinition[] = [
  { pattern: "/design-system", entrypoint: "../design-system/pages/index.astro" },
  { pattern: "/design-system/foundations", entrypoint: "../design-system/pages/foundations.astro" },
  { pattern: "/design-system/components", entrypoint: "../design-system/pages/components.astro" },
  { pattern: "/design-system/patterns", entrypoint: "../design-system/pages/patterns.astro" },
  { pattern: "/design-system/content", entrypoint: "../design-system/pages/content.astro" },
  { pattern: "/design-system/governance", entrypoint: "../design-system/pages/governance.astro" },
  // 記事の読書体験の標本を移動する前のURL。どちらも現在の場所へ転送する。
  {
    pattern: "/design-system/patterns/article-reading",
    entrypoint: "../design-system/pages/article-reading-redirect.astro",
  },
  {
    pattern: "/design-system/article-reading",
    entrypoint: "../design-system/pages/article-reading-redirect.astro",
  },
];

const TEST_FIXTURE_ROUTES: readonly RouteDefinition[] = [
  { pattern: "/__test/home", entrypoint: "../test-fixtures/pages/home.astro" },
  { pattern: "/__test/posts", entrypoint: "../test-fixtures/pages/posts.astro" },
  { pattern: "/__test/404", entrypoint: "../test-fixtures/pages/404.astro" },
];

/**
 * `src/pages`の外に置いたページをルートとして登録する。
 *
 * デザインシステムのカタログは本番を含むすべてのコマンドで登録する。
 * ブラウザテスト用fixtureは、開発サーバーと`TEST_FIXTURES=true`を指定した
 * テストビルドだけに登録し、本番の成果物へ出力しない。
 */
export function injectedRoutes(): AstroIntegration {
  return {
    name: "kjr020:injected-routes",
    hooks: {
      "astro:config:setup": ({ command, injectRoute }) => {
        const includesTestFixtures =
          command === "dev" || (command === "build" && process.env.TEST_FIXTURES === "true");

        const routes = [
          ...DESIGN_SYSTEM_ROUTES,
          ...(includesTestFixtures ? TEST_FIXTURE_ROUTES : []),
        ];

        for (const { pattern, entrypoint } of routes) {
          injectRoute({ pattern, entrypoint: new URL(entrypoint, import.meta.url) });
        }
      },
    },
  };
}
