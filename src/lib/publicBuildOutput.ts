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
  /**
   * 記事ページのコメント欄にGiscusの設定が埋め込まれていることを必須にするか。
   *
   * 設定はビルド時の`PUBLIC_GISCUS_*`から埋め込まれる。値を持たないローカルビルドや
   * E2Eのビルドでは検査せず、GitHub Actionsのビルドだけが`REQUIRE_COMMENTS`で有効にする。
   */
  requiresComments: boolean;
};

const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const META_TAG = /<meta\b[^>]*>/gi;
const ATTRIBUTE = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
const ASTRO_ISLAND_TAG = /<astro-island\b[^>]*>/gi;

/** Commentsが`@giscus/react`へ渡す設定のprops名 */
const GISCUS_PROPS = ["repo", "repoId", "category", "categoryId"] as const;

/** sitemapの`<loc>`とRSSの`<link>`だけを読む。記事本文に含まれるリンクは対象にしない。 */
const LISTED_URL = /<(loc|link)>([^<]+)<\/\1>/g;

const SITEMAP_FILE = /^sitemap-\d+\.xml$/;
const RSS_FILE = "rss.xml";

/** HTMLコメントを取り除く。コメント内の要素はブラウザーやクローラーに対して効かないため。 */
function withoutComments(html: string) {
  return html.replace(HTML_COMMENT, "");
}

/** 開始タグの属性を、小文字の属性名から値への対応で返す。 */
function parseAttributes(tag: string): Map<string, string> {
  return new Map(
    Array.from(tag.matchAll(ATTRIBUTE), ([, name, ...values]) => [
      name.toLowerCase(),
      values.find((value) => value !== undefined) ?? "",
    ]),
  );
}

/** 属性値の文字参照を戻す。Astroはislandのpropsをこれらの文字参照でエスケープする。 */
function decodeAttribute(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

/** HTML内の`<meta name="robots">`が指定するdirectiveを、小文字の集合で返す。 */
function robotsDirectives(html: string): Set<string> {
  const directives = new Set<string>();

  for (const [tag] of withoutComments(html).matchAll(META_TAG)) {
    const attributes = parseAttributes(tag);
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
 * HTML内のコメント欄ごとに、値が空のGiscusの設定名を返す。
 *
 * Astroはislandのpropsを`[型, 値]`の形でシリアライズし、undefinedの値は`[0]`になる。
 */
function emptyGiscusPropsOfComments(html: string): string[][] {
  return Array.from(withoutComments(html).matchAll(ASTRO_ISLAND_TAG), ([tag]) =>
    parseAttributes(tag),
  )
    .filter((attributes) => attributes.get("component-export") === "Comments")
    .map((attributes) => {
      const props: Record<string, unknown> = JSON.parse(
        decodeAttribute(attributes.get("props") ?? "{}"),
      );
      return GISCUS_PROPS.filter((name) => {
        const prop = props[name];
        return !(Array.isArray(prop) && typeof prop[1] === "string" && prop[1] !== "");
      });
    });
}

/**
 * ビルドの成果物が公開の条件を満たしているかを検査し、問題の説明を返す。
 *
 * - デザインシステムのカタログが出力され、`noindex,nofollow`を指定している
 * - カタログがPagefindの索引に入らない
 * - fixtureを許可したテストビルド以外では、テスト用fixtureを出力していない
 * - sitemapとRSSが出力され、カタログのURLを含んでいない
 * - 設定を必須にしたビルドでは、コメント欄にGiscusの設定が埋め込まれている
 */
export function findPublicBuildOutputProblems({
  files,
  readFile,
  allowsTestFixtures,
  requiresComments,
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

  if (requiresComments) {
    let hasComments = false;
    for (const file of htmlFiles) {
      for (const emptyProps of emptyGiscusPropsOfComments(readFile(file))) {
        hasComments = true;
        if (emptyProps.length > 0) {
          problems.push(`${file}: Giscusの設定が空です(${emptyProps.join(", ")})`);
        }
      }
    }
    if (!hasComments) {
      problems.push("コメント欄を持つページがありません");
    }
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
