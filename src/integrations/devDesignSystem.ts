import type { AstroIntegration } from "astro";

/**
 * デザインシステムとVRT fixtureを本番サイトから分離して公開する。
 *
 * デザインシステムは開発サーバーだけ、VRT fixtureは開発サーバーと
 * `VRT_FIXTURES=true`を指定したテストビルドだけにルートを注入する。
 */
export function devDesignSystem(): AstroIntegration {
  return {
    name: "kjr020:dev-design-system",
    hooks: {
      "astro:config:setup": ({ command, injectRoute }) => {
        const includesDesignSystem = command === "dev";
        const includesVrtFixtures =
          command === "dev" || (command === "build" && process.env.VRT_FIXTURES === "true");

        if (!includesDesignSystem && !includesVrtFixtures) {
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

        if (includesVrtFixtures) {
          injectRoute({
            pattern: "/__vrt/home",
            entrypoint: new URL("../vrt/pages/home.astro", import.meta.url),
          });
          injectRoute({
            pattern: "/__vrt/posts",
            entrypoint: new URL("../vrt/pages/posts.astro", import.meta.url),
          });
          injectRoute({
            pattern: "/__vrt/search",
            entrypoint: new URL("../vrt/pages/search.astro", import.meta.url),
          });
          injectRoute({
            pattern: "/__vrt/404",
            entrypoint: new URL("../vrt/pages/404.astro", import.meta.url),
          });
        }
      },
    },
  };
}
