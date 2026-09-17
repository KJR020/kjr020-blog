import type { AstroIntegration } from "astro";

/**
 * デザインシステムとブラウザテスト用fixtureを本番サイトから分離して公開する。
 *
 * デザインシステムは開発サーバーだけ、fixtureは開発サーバーと
 * `TEST_FIXTURES=true`を指定したテストビルドだけにルートを注入する。
 */
export function devDesignSystem(): AstroIntegration {
  return {
    name: "kjr020:dev-design-system",
    hooks: {
      "astro:config:setup": ({ command, injectRoute }) => {
        const includesDesignSystem = command === "dev";
        const includesTestFixtures =
          command === "dev" || (command === "build" && process.env.TEST_FIXTURES === "true");

        if (!includesDesignSystem && !includesTestFixtures) {
          return;
        }

        if (includesDesignSystem) {
          injectRoute({
            pattern: "/design-system",
            entrypoint: new URL("../design-system/pages/index.astro", import.meta.url),
          });
          injectRoute({
            pattern: "/design-system/foundations",
            entrypoint: new URL("../design-system/pages/foundations.astro", import.meta.url),
          });
          injectRoute({
            pattern: "/design-system/components",
            entrypoint: new URL("../design-system/pages/components.astro", import.meta.url),
          });
          injectRoute({
            pattern: "/design-system/patterns",
            entrypoint: new URL("../design-system/pages/patterns.astro", import.meta.url),
          });
          injectRoute({
            pattern: "/design-system/content",
            entrypoint: new URL("../design-system/pages/content.astro", import.meta.url),
          });
          injectRoute({
            pattern: "/design-system/governance",
            entrypoint: new URL("../design-system/pages/governance.astro", import.meta.url),
          });
          injectRoute({
            pattern: "/design-system/patterns/article-reading",
            entrypoint: new URL(
              "../design-system/pages/article-reading-redirect.astro",
              import.meta.url,
            ),
          });
          injectRoute({
            pattern: "/design-system/article-reading",
            entrypoint: new URL(
              "../design-system/pages/article-reading-redirect.astro",
              import.meta.url,
            ),
          });
        }

        if (includesTestFixtures) {
          injectRoute({
            pattern: "/__test/home",
            entrypoint: new URL("../test-fixtures/pages/home.astro", import.meta.url),
          });
          injectRoute({
            pattern: "/__test/posts",
            entrypoint: new URL("../test-fixtures/pages/posts.astro", import.meta.url),
          });
          injectRoute({
            pattern: "/__test/search",
            entrypoint: new URL("../test-fixtures/pages/search.astro", import.meta.url),
          });
          injectRoute({
            pattern: "/__test/404",
            entrypoint: new URL("../test-fixtures/pages/404.astro", import.meta.url),
          });
        }
      },
    },
  };
}
