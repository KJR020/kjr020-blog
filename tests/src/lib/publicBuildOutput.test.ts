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
  { allowsTestFixtures = false, requiresComments = false } = {},
) {
  return findPublicBuildOutputProblems({
    ...buildOutput(overrides),
    allowsTestFixtures,
    requiresComments,
  });
}

/** Astroが`client:only`のCommentsを出力するときの`<astro-island>`を模す。 */
function commentsIsland(props: Record<string, unknown>) {
  const serialized = JSON.stringify(props).replaceAll('"', "&quot;");
  return `<astro-island uid="a1" component-url="/_astro/Comments.abc.js" component-export="Comments" props="${serialized}" ssr client="only"></astro-island>`;
}

const giscusProps = {
  repo: [0, "KJR020/kjr020-blog"],
  repoId: [0, "R_kgDOMtTHnQ"],
  category: [0, "Comments"],
  categoryId: [0, "DIC_kwDOMtTHnc4C1EHQ"],
};

function articleWithComments(props: Record<string, unknown> = giscusProps) {
  return articleHtml.replace("</body>", `${commentsIsland(props)}</body>`);
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
          "コメントの中にだけ指定している",
          '<!-- <meta name="robots" content="noindex,nofollow"> -->',
        ],
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

      it("コメントの中にだけdata-pagefind-bodyがあれば、ないものとして報告する", () => {
        const html = "<html><body><!-- <article data-pagefind-body> --></body></html>";

        expect(problemsOf({ "posts/hello/index.html": html })).toEqual([
          "data-pagefind-bodyを持つページがないため、Pagefindがカタログも索引します",
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

  describe("コメント欄", () => {
    it("Giscusの設定が埋め込まれていれば報告しない", () => {
      expect(
        problemsOf({ "posts/hello/index.html": articleWithComments() }, { requiresComments: true }),
      ).toEqual([]);
    });

    it.each([
      ["undefined", [0]],
      ["空文字", [0, ""]],
    ])("設定が %s のページを、空の項目とともに報告する", (_, empty) => {
      const html = articleWithComments({ ...giscusProps, repoId: empty, categoryId: empty });

      expect(problemsOf({ "posts/hello/index.html": html }, { requiresComments: true })).toEqual([
        "posts/hello/index.html: Giscusの設定が空です(repoId, categoryId)",
      ]);
    });

    it("コメント欄を持つページがなければ報告する", () => {
      expect(problemsOf({}, { requiresComments: true })).toEqual([
        "コメント欄を持つページがありません",
      ]);
    });

    it("HTMLコメントの中にだけコメント欄があれば、ないものとして報告する", () => {
      const html = articleHtml.replace("</body>", `<!-- ${commentsIsland(giscusProps)} --></body>`);

      expect(problemsOf({ "posts/hello/index.html": html }, { requiresComments: true })).toEqual([
        "コメント欄を持つページがありません",
      ]);
    });

    it("ほかのislandのpropsは検査しない", () => {
      const otherIsland =
        '<astro-island component-export="MobileMenu" props="{}" client="only"></astro-island>';
      const html = articleWithComments().replace("</body>", `${otherIsland}</body>`);

      expect(problemsOf({ "posts/hello/index.html": html }, { requiresComments: true })).toEqual(
        [],
      );
    });

    it("設定を必須にしないビルドでは報告しない", () => {
      // Giscusの設定を持たないローカルビルドやE2Eのビルド
      const html = articleWithComments({ ...giscusProps, repo: [0] });

      expect(problemsOf({ "posts/hello/index.html": html })).toEqual([]);
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
