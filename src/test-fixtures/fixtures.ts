import type { PostSummary, TagSummary } from "@/components/pages/types";
import type { ScrapboxPageData } from "@/components/scrapbox/types";

export const fixturePosts: PostSummary[] = [
  {
    id: "fixture/layout-boundaries",
    data: {
      title: "長い記事タイトルでもカードと本文の境界を崩さずに表示するための固定fixture",
      date: new Date("2026-03-15T00:00:00.000Z"),
      tags: ["Visual Regression", "レイアウト", "長いタグ名"],
    },
  },
  {
    id: "fixture/astro-components",
    data: {
      title: "Astroコンポーネントの表示確認",
      date: new Date("2026-02-10T00:00:00.000Z"),
      tags: ["Astro", "Frontend"],
    },
  },
  {
    id: "fixture/testing-strategy",
    data: {
      title: "E2EとVRTの責務を整理する",
      date: new Date("2026-01-05T00:00:00.000Z"),
      tags: ["Testing"],
    },
  },
  {
    id: "fixture/accessibility",
    data: {
      title: "キーボード操作とアクセシビリティ",
      date: new Date("2025-12-20T00:00:00.000Z"),
      tags: ["Accessibility", "Frontend"],
    },
  },
  {
    id: "fixture/design-system",
    data: {
      title: "デザインシステムの運用メモ",
      date: new Date("2025-11-08T00:00:00.000Z"),
      tags: ["Design System"],
    },
  },
];

export const fixtureScrapboxPages: ScrapboxPageData[] = [
  {
    id: "fixture-astro-notes",
    title: "Astroブログの固定メモ",
    imageUrl: null,
    description: "Astroで調べたことや試したことの固定fixture。",
    updatedAt: "2026-03-10T12:00:00.000Z",
    url: "https://example.com/scrapbox/astro-notes",
  },
  {
    id: "fixture-playwright-notes",
    title: "Playwrightのスナップショット",
    imageUrl: null,
    description: "画像比較を安定させるための固定fixture。",
    updatedAt: "2026-02-24T12:00:00.000Z",
    url: "https://example.com/scrapbox/playwright",
  },
  {
    id: "fixture-web-notes",
    title: "Web開発の調べもの",
    imageUrl: null,
    description: "外部サービスへ接続しない固定fixture。",
    updatedAt: "2026-01-18T12:00:00.000Z",
    url: "https://example.com/scrapbox/web",
  },
];

export const fixtureTags: TagSummary[] = [
  { name: "Astro", count: 8 },
  { name: "Testing", count: 5 },
  { name: "Frontend", count: 3 },
  { name: "Accessibility", count: 2 },
  { name: "Visual Regression", count: 1 },
];
