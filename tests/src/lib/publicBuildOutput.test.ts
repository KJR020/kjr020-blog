import { describe, expect, it } from "vitest";

import { findPublicBuildOutputProblems } from "@/lib/publicBuildOutput";

const catalogFiles = [
  "design-system/index.html",
  "design-system/foundations/index.html",
  "design-system/components/index.html",
  "design-system/patterns/index.html",
  "design-system/content/index.html",
  "design-system/governance/index.html",
];

const catalogHtml =
  '<!DOCTYPE html><html><head><title>基盤</title><meta name="robots" content="noindex,nofollow"></head><body><main>標本</main></body></html>';

const articleHtml = "<html><body><article data-pagefind-body>本文</article></body></html>";

const sitemap =
  '<?xml version="1.0"?><urlset><url><loc>https://kjr020.dev/</loc></url><url><loc>https://kjr020.dev/posts/</loc></url></urlset>';

const rss =
  "<rss><channel><link>https://kjr020.dev/</link><item><link>https://kjr020.dev/posts/hello/</link><description>&lt;a href=&quot;https://kjr020.dev/design-system&quot;&gt;</description></item></channel></rss>";

function buildOutput(overrides: Record<string, string | undefined> = {}) {
  const contents: Record<string, string | undefined> = {
    "index.html": "<html></html>",
    "posts/hello/index.html": articleHtml,
    "sitemap-index.xml": "<sitemapindex></sitemapindex>",
    "sitemap-0.xml": sitemap,
    "rss.xml": rss,
    ...Object.fromEntries(catalogFiles.map((file) => [file, catalogHtml])),
    ...overrides,
  };
  const files = Object.entries(contents)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([file]) => file);

  return {
    files,
    readFile: (file: string) => {
      const content = contents[file];
      if (content === undefined) throw new Error(`not found: ${file}`);
      return content;
    },
  };
}

function problemsOf(
  overrides: Record<string, string | undefined> = {},
  { allowsTestFixtures = false } = {},
) {
  return findPublicBuildOutputProblems({ ...buildOutput(overrides), allowsTestFixtures });
}

describe("findPublicBuildOutputProblems", () => {
  it("公開すべきページだけが条件どおりに出力されていれば問題を返さない", () => {
    expect(problemsOf()).toEqual([]);
  });

  describe("デザインシステムのカタログ", () => {
    it("ページが出力されていなければ報告する", () => {
      expect(problemsOf({ "design-system/governance/index.html": undefined })).toEqual([
        "design-system/governance/index.html: デザインシステムのページが出力されていません",
      ]);
    });

    describe("robots", () => {
      it.each([
        ["属性の順序が逆", '<meta content="noindex,nofollow" name="robots">'],
        ["区切りに空白がある", '<meta name="robots" content="noindex, nofollow">'],
        ["directiveの順序が逆", '<meta name="robots" content="nofollow,noindex">'],
        ["大文字を含む", '<meta name="ROBOTS" content="NoIndex,NoFollow">'],
        ["ほかのdirectiveも含む", '<meta name="robots" content="noindex,nofollow,noarchive">'],
        [
          "複数のmetaに分かれている",
          '<meta name="robots" content="noindex"><meta name="robots" content="nofollow">',
        ],
        ["noneを指定している", '<meta name="robots" content="none">'],
      ])("%s 場合もnoindexとnofollowが有効なら報告しない", (_, meta) => {
        const html = `<html><head>${meta}</head></html>`;

        expect(problemsOf({ "design-system/foundations/index.html": html })).toEqual([]);
      });

      it.each([
        ["robotsの指定がない", ""],
        ["noindexだけを指定している", '<meta name="robots" content="noindex">'],
        ["index,followを指定している", '<meta name="robots" content="index,follow">'],
        [
          "別のmetaにnoindex,nofollowを書いている",
          '<meta name="googlebot-news" content="noindex,nofollow">',
        ],
      ])("%s ページを報告する", (_, meta) => {
        const html = `<html><head><title>基盤</title>${meta}</head></html>`;

        expect(problemsOf({ "design-system/foundations/index.html": html })).toEqual([
          "design-system/foundations/index.html: noindex,nofollowが指定されていません",
        ]);
      });
    });

    describe("サイト内検索", () => {
      it("カタログのページにdata-pagefind-bodyがあれば報告する", () => {
        const html = catalogHtml.replace("<main>", "<main data-pagefind-body>");

        expect(problemsOf({ "design-system/patterns/index.html": html })).toEqual([
          "design-system/patterns/index.html: data-pagefind-bodyが指定されています",
        ]);
      });

      it("どのページにもdata-pagefind-bodyがなければ報告する", () => {
        // Pagefindは、data-pagefind-bodyが1つもないとすべてのページを索引する
        expect(problemsOf({ "posts/hello/index.html": "<html><body>本文</body></html>" })).toEqual([
          "data-pagefind-bodyを持つページがないため、Pagefindがカタログも索引します",
        ]);
      });
    });
  });

  describe("テスト用fixture", () => {
    it.each([
      "__test/home/index.html",
      "posts/__test/article/index.html",
    ])("通常のビルドに %s があれば報告する", (file) => {
      expect(problemsOf({ [file]: "<html></html>" })).toEqual([
        `${file}: テスト用fixtureが出力されています`,
      ]);
    });

    it("fixtureを許可したテストビルドでは報告しない", () => {
      expect(
        problemsOf({ "__test/home/index.html": "<html></html>" }, { allowsTestFixtures: true }),
      ).toEqual([]);
    });

    it("名前に__testを含むだけのページは報告しない", () => {
      expect(problemsOf({ "posts/about__test/index.html": "<html></html>" })).toEqual([]);
    });
  });

  describe("sitemapとRSS", () => {
    it("sitemapにカタログのURLがあれば報告する", () => {
      const withCatalog = sitemap.replace(
        "</urlset>",
        "<url><loc>https://kjr020.dev/design-system/foundations/</loc></url></urlset>",
      );

      expect(problemsOf({ "sitemap-0.xml": withCatalog })).toEqual([
        "sitemap-0.xml: デザインシステムのURLが含まれています",
      ]);
    });

    it("RSSの項目リンクにカタログのURLがあれば報告する", () => {
      const withCatalog = rss.replace(
        "</channel>",
        "<item><link>https://kjr020.dev/design-system/</link></item></channel>",
      );

      expect(problemsOf({ "rss.xml": withCatalog })).toEqual([
        "rss.xml: デザインシステムのURLが含まれています",
      ]);
    });

    it("記事本文からカタログへリンクしているだけなら報告しない", () => {
      // 既定のRSSは、本文のdescriptionにカタログへのリンクを含んでいる
      expect(problemsOf()).toEqual([]);
    });

    it("sitemapが出力されていなければ報告する", () => {
      expect(problemsOf({ "sitemap-0.xml": undefined })).toEqual([
        "sitemap-*.xml: sitemapが出力されていません",
      ]);
    });

    it("RSSが出力されていなければ報告する", () => {
      expect(problemsOf({ "rss.xml": undefined })).toEqual(["rss.xml: RSSが出力されていません"]);
    });
  });
});
