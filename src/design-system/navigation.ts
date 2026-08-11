export type DesignSystemPageId =
  | "overview"
  | "foundations"
  | "components"
  | "patterns"
  | "content"
  | "governance";

export type DesignSystemNavigationLink = {
  label: string;
  href: string;
};

export type DesignSystemNavigationGroup = {
  label: string;
  href: string;
  links: readonly DesignSystemNavigationLink[];
};

export const designSystemPages = [
  {
    id: "overview",
    label: "概要",
    href: "/design-system",
    description: "このデザインシステムの目的、適用範囲、5つのカテゴリ",
  },
  {
    id: "foundations",
    label: "基盤",
    href: "/design-system/foundations",
    description: "色・文字・余白・Gridなど、全ページが共有する値と配置のルール",
  },
  {
    id: "components",
    label: "コンポーネント",
    href: "/design-system/components",
    description: "情報表示と操作を一貫して実装するための再利用可能なUI部品",
  },
  {
    id: "patterns",
    label: "パターン",
    href: "/design-system/patterns",
    description: "状態、記事、ページを読者の目的に沿って組み立てる方法",
  },
  {
    id: "content",
    label: "コンテンツ",
    href: "/design-system/content",
    description: "操作と状態を自然で具体的な言葉で伝えるUIライティング",
  },
  {
    id: "governance",
    label: "ガバナンス",
    href: "/design-system/governance",
    description: "正規仕様と実装を一致させて保つための管理・更新ルール",
  },
] as const satisfies readonly (DesignSystemNavigationLink & {
  id: DesignSystemPageId;
  description: string;
})[];

export const designSystemPageGroups: Record<
  DesignSystemPageId,
  readonly DesignSystemNavigationGroup[]
> = {
  overview: [],
  foundations: [
    {
      label: "1. トークン",
      href: "/design-system/foundations#tokens",
      links: [
        { label: "カラー", href: "/design-system/foundations#color" },
        { label: "記事コールアウト色", href: "/design-system/foundations#callout-colors" },
        { label: "タイポグラフィ", href: "/design-system/foundations#typography" },
        { label: "スペーシング", href: "/design-system/foundations#spacing" },
        { label: "角丸・影", href: "/design-system/foundations#radius" },
      ],
    },
    {
      label: "2. レイアウト原則",
      href: "/design-system/foundations#layout",
      links: [
        { label: "ページシェル", href: "/design-system/foundations#page-shell" },
        { label: "Gridの基本構造", href: "/design-system/foundations#grid" },
        { label: "Grid breakpoints", href: "/design-system/foundations#grid-breakpoints" },
        { label: "Grid types", href: "/design-system/foundations#grid-types" },
        { label: "配置パターン", href: "/design-system/foundations#grid-composition" },
        { label: "幅トークン", href: "/design-system/foundations#width-tokens" },
        { label: "余白の階層", href: "/design-system/foundations#spacing-hierarchy" },
        { label: "見出しと強調", href: "/design-system/foundations#emphasis-hierarchy" },
      ],
    },
    {
      label: "10. レスポンシブ・A11y",
      href: "/design-system/foundations#responsive",
      links: [
        { label: "レスポンシブ規則", href: "/design-system/foundations#responsive-rules" },
        { label: "キーボード・ARIA", href: "/design-system/foundations#keyboard-aria" },
        { label: "Motion / Loading", href: "/design-system/foundations#motion-loading" },
      ],
    },
  ],
  components: [
    {
      label: "4. 基本部品",
      href: "/design-system/components#primitives",
      links: [
        { label: "ボタン", href: "/design-system/components#button" },
        { label: "バッジ・タグ", href: "/design-system/components#badge" },
        { label: "カード", href: "/design-system/components#card" },
        { label: "入力・リンク・Kbd", href: "/design-system/components#input" },
      ],
    },
    {
      label: "5. ナビゲーション・検索",
      href: "/design-system/components#navigation",
      links: [
        { label: "Header", href: "/design-system/components#global-navigation" },
        { label: "SearchBox", href: "/design-system/components#search-box" },
        { label: "Command Palette", href: "/design-system/components#command-palette" },
        { label: "Theme / Mobile Menu", href: "/design-system/components#theme-mobile" },
      ],
    },
    {
      label: "6. ブログ固有部品",
      href: "/design-system/components#blog-components",
      links: [
        { label: "PageHero", href: "/design-system/components#page-hero" },
        { label: "PostCard / PostMeta", href: "/design-system/components#post-card" },
        { label: "Table of Contents", href: "/design-system/components#table-of-contents" },
        { label: "Scrapbox Card List", href: "/design-system/components#scrapbox-card-list" },
      ],
    },
  ],
  patterns: [
    {
      label: "3. 状態の体系",
      href: "/design-system/patterns#states",
      links: [
        { label: "操作状態", href: "/design-system/patterns#interaction-states" },
        { label: "非同期データ", href: "/design-system/patterns#async-states" },
        { label: "現在地と選択", href: "/design-system/patterns#selection-states" },
      ],
    },
    {
      label: "7. 記事コンテンツ",
      href: "/design-system/patterns#article",
      links: [
        { label: "Markdown本文", href: "/design-system/patterns#markdown-content" },
        { label: "Callout", href: "/design-system/patterns#callout" },
        { label: "Link Card", href: "/design-system/patterns#link-card" },
        { label: "Code Copy / Image", href: "/design-system/patterns#code-image" },
      ],
    },
    {
      label: "8. ページの型",
      href: "/design-system/patterns#pages",
      links: [
        { label: "ホーム", href: "/design-system/patterns#home-page" },
        { label: "記事一覧", href: "/design-system/patterns#post-archive-page" },
        { label: "記事ページ", href: "/design-system/patterns#article-reading" },
        { label: "検索", href: "/design-system/patterns#search-page" },
        { label: "ポリシー・状態", href: "/design-system/patterns#policy-state-page" },
      ],
    },
  ],
  content: [
    {
      label: "9. UIライティング",
      href: "/design-system/content#writing",
      links: [
        { label: "声の性格", href: "/design-system/content#voice" },
        { label: "文言設計の6原則", href: "/design-system/content#writing-principles" },
        { label: "コンポーネント文法", href: "/design-system/content#component-grammar" },
        { label: "表記", href: "/design-system/content#notation" },
        { label: "状態メッセージ", href: "/design-system/content#state-messages" },
      ],
    },
  ],
  governance: [
    {
      label: "11. ガバナンス",
      href: "/design-system/governance#governance",
      links: [
        { label: "Source of Truth", href: "/design-system/governance#source-of-truth" },
        { label: "適合ルール", href: "/design-system/governance#conformance-rules" },
        { label: "更新方法", href: "/design-system/governance#update-method" },
      ],
    },
  ],
};

const legacySectionGroups = {
  "/design-system/foundations": [
    "tokens",
    "color",
    "callout-colors",
    "typography",
    "spacing",
    "radius",
    "layout",
    "page-shell",
    "grid",
    "grid-breakpoints",
    "grid-types",
    "grid-composition",
    "width-tokens",
    "spacing-hierarchy",
    "emphasis-hierarchy",
    "responsive",
    "responsive-rules",
    "keyboard-aria",
    "motion-loading",
  ],
  "/design-system/components": [
    "primitives",
    "button",
    "badge",
    "card",
    "input",
    "navigation",
    "global-navigation",
    "search-box",
    "command-palette",
    "theme-mobile",
    "blog-components",
    "page-hero",
    "post-card",
    "table-of-contents",
    "scrapbox-card-list",
  ],
  "/design-system/patterns": [
    "states",
    "interaction-states",
    "async-states",
    "selection-states",
    "article",
    "markdown-content",
    "callout",
    "link-card",
    "code-image",
    "article-reading",
    "pages",
  ],
  "/design-system/content": [
    "writing",
    "voice",
    "writing-principles",
    "component-grammar",
    "notation",
    "state-messages",
  ],
  "/design-system/governance": [
    "governance",
    "source-of-truth",
    "conformance-rules",
    "update-method",
  ],
} as const;

export const legacySectionRoutes = Object.fromEntries(
  Object.entries(legacySectionGroups).flatMap(([path, sections]) =>
    sections.map((section) => [section, path]),
  ),
) as Record<string, string>;

export function isTopLevelPageCurrent(
  activePage: DesignSystemPageId,
  pageId: DesignSystemPageId,
): boolean {
  return activePage === pageId;
}
