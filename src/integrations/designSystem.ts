import type { AstroIntegration } from "astro";

/**
 * デザインシステムの公開ルートをAstroへ登録する。
 */
export function designSystem(): AstroIntegration {
  return {
    name: "kjr020:design-system",
    hooks: {
      "astro:config:setup": ({ injectRoute }) => {
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
      },
    },
  };
}
