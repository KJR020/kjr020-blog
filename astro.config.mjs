// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import pagefind from "astro-pagefind";
import { rehypeMermaid } from "@beoe/rehype-mermaid";
// @ts-ignore
import remarkLinkCard from "remark-link-card";
import remarkCallout from "@r4ai/remark-callout";
import { devDesignSystem } from "./src/integrations/devDesignSystem.ts";
import { rehypeArticleFigures } from "./src/integrations/rehypeArticleFigures.ts";

/** @type {Record<string, string>} */
const calloutIcons = {
  note: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  tip: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m6.34 7.34 2.83 2.83"/><path d="M2 12h4"/><path d="m6.34 16.66 2.83-2.83"/><path d="M12 18v4"/><path d="m17.66 16.66-2.83-2.83"/><path d="M22 12h-4"/><path d="m17.66 7.34-2.83 2.83"/></svg>',
  warning: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  danger: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
};

/**
 * @param {{ linkCardFetchMode: "live" | "offline" }} options
 * @returns {import("@astrojs/markdown-remark").RemarkPlugins}
 */
export function createRemarkPlugins({ linkCardFetchMode }) {
  /** @type {import("@astrojs/markdown-remark").RemarkPlugins} */
  const remarkPlugins = [
    [
      remarkCallout,
      {
        icon: (/** @type {{ type: string }} */ callout) =>
          calloutIcons[callout.type] || calloutIcons.note,
      },
    ],
  ];

  if (linkCardFetchMode === "live") {
    remarkPlugins.push([remarkLinkCard, { cache: false, shortenUrl: true }]);
  }

  return remarkPlugins;
}

const linkCardFetchMode = process.env.LINK_CARD_FETCH_MODE === "offline" ? "offline" : "live";

// https://astro.build/config
export default defineConfig({
  site: "https://kjr020.dev",
  compressHTML: true,
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Noto Sans JP",
      cssVariable: "--font-noto-sans-jp",
      weights: ["400 900"],
      styles: ["normal"],
      subsets: ["japanese"],
      fallbacks: ["system-ui", "sans-serif"],
      // 全角グリフ基準のsize-adjust(約197%)で、読み込み中に英数字だけ拡大されるのを防ぐ
      optimizedFallbacks: false,
    },
    {
      provider: fontProviders.google(),
      name: "JetBrains Mono",
      cssVariable: "--font-jetbrains-mono",
      weights: [400, 500],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["ui-monospace", "monospace"],
    },
  ],
  build: {
    format: "directory",
  },
  integrations: [react(), sitemap(), pagefind(), devDesignSystem()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    processor: unified({
      remarkPlugins: createRemarkPlugins({ linkCardFetchMode }),
      rehypePlugins: [rehypeArticleFigures, [rehypeMermaid, { class: "mermaid" }]],
      remarkRehype: {
        footnoteLabel: "脚注",
        footnoteLabelTagName: "h2",
      },
    }),
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: false,
    },
  },
});
