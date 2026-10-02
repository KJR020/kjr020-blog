import { designSystemPages, isDesignSystemPage } from "@/design-system/navigation";

type FindPublicBuildOutputProblemsOptions = {
  /** 出力ディレクトリからの相対パス(POSIX形式) */
  files: readonly string[];
  readFile: (file: string) => string;
  /**
   * テスト用fixtureの出力を許可するか。
   *
   * fixtureを生成する`TEST_FIXTURES`とは別に、テストビルドのコマンドから明示的に渡す。
   * 同じ環境変数で生成と許可を切り替えると、本番へ混入したときに検査も素通りするため。
   */
  allowsTestFixtures: boolean;
};

const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const META_TAG = /<meta\b[^>]*>/gi;
const ATTRIBUTE = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

/** sitemapの`<loc>`とRSSの`<link>`だけを読む。記事本文に含まれるリンクは対象にしない。 */
const LISTED_URL = /<(loc|link)>([^<]+)<\/\1>/g;

const SITEMAP_FILE = /^sitemap-\d+\.xml$/;
const RSS_FILE = "rss.xml";

/** HTMLコメントを取り除く。コメント内の要素はブラウザーやクローラーに対して効かないため。 */
function withoutComments(html: string) {
  return html.replace(HTML_COMMENT, "");
}

/** HTML内の`<meta name="robots">`が指定するdirectiveを、小文字の集合で返す。 */
function robotsDirectives(html: string): Set<string> {
  const directives = new Set<string>();

  for (const [tag] of withoutComments(html).matchAll(META_TAG)) {
    const attributes = new Map(
      Array.from(tag.matchAll(ATTRIBUTE), ([, name, ...values]) => [
        name.toLowerCase(),
        values.find((value) => value !== undefined) ?? "",
      ]),
    );
    if (attributes.get("name")?.toLowerCase() !== "robots") continue;

    for (const directive of attributes.get("content")?.split(",") ?? []) {
      directives.add(directive.trim().toLowerCase());
    }
  }

  return directives;
}

function preventsIndexAndFollow(html: string) {
  const directives = robotsDirectives(html);
  return directives.has("none") || (directives.has("noindex") && directives.has("nofollow"));
}

function hasPagefindBody(html: string) {
  return withoutComments(html).includes("data-pagefind-body");
}

/**
 * ビルドの成果物が公開の条件を満たしているかを検査し、問題の説明を返す。
 *
 * - デザインシステムのカタログが出力され、`noindex,nofollow`を指定している
 * - カタログがPagefindの索引に入らない
 * - fixtureを許可したテストビルド以外では、テスト用fixtureを出力していない
 * - sitemapとRSSが出力され、カタログのURLを含んでいない
 */
export function findPublicBuildOutputProblems({
  files,
  readFile,
  allowsTestFixtures,
}: FindPublicBuildOutputProblemsOptions): string[] {
  const problems: string[] = [];
  const outputFiles = new Set(files);

  for (const { href } of designSystemPages) {
    const file = `${href.slice(1)}/index.html`;
    if (!outputFiles.has(file)) {
      problems.push(`${file}: デザインシステムのページが出力されていません`);
      continue;
    }

    const html = readFile(file);
    if (!preventsIndexAndFollow(html)) {
      problems.push(`${file}: noindex,nofollowが指定されていません`);
    }
    if (hasPagefindBody(html)) {
      problems.push(`${file}: data-pagefind-bodyが指定されています`);
    }
  }

  // Pagefindは、data-pagefind-bodyを持つページが1つもないと、すべてのページを索引する
  const htmlFiles = files.filter((file) => file.endsWith(".html"));
  if (!htmlFiles.some((file) => hasPagefindBody(readFile(file)))) {
    problems.push("data-pagefind-bodyを持つページがないため、Pagefindがカタログも索引します");
  }

  if (!allowsTestFixtures) {
    for (const file of files) {
      if (file.split("/").includes("__test")) {
        problems.push(`${file}: テスト用fixtureが出力されています`);
      }
    }
  }

  const sitemapFiles = files.filter((file) => SITEMAP_FILE.test(file));
  if (sitemapFiles.length === 0) {
    problems.push("sitemap-*.xml: sitemapが出力されていません");
  }
  if (!outputFiles.has(RSS_FILE)) {
    problems.push(`${RSS_FILE}: RSSが出力されていません`);
  }

  for (const file of [...sitemapFiles, ...(outputFiles.has(RSS_FILE) ? [RSS_FILE] : [])]) {
    const listedUrls = Array.from(readFile(file).matchAll(LISTED_URL), (match) => match[2].trim());
    if (listedUrls.some(isDesignSystemPage)) {
      problems.push(`${file}: デザインシステムのURLが含まれています`);
    }
  }

  return problems;
}
