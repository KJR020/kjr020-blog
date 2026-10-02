import { isPublishedPost } from "./posts";

type PostRouteEntry = {
  id: string;
  data: {
    draft?: boolean;
  };
};

/**
 * 公開する記事だけを、記事詳細ルートの静的パスへ変換する。
 *
 * `includedDraftIds`に挙げた下書きは例外として生成する。テストビルドで、
 * 固定fixture記事を通常の記事と同じルートへ出力するために使う。
 */
export function createPublishedPostStaticPaths<TPost extends PostRouteEntry>(
  posts: TPost[],
  includedDraftIds: readonly string[] = [],
) {
  return posts
    .filter((post) => isPublishedPost(post) || includedDraftIds.includes(post.id))
    .map((post) => ({
      params: { slug: post.id },
      props: { post },
    }));
}

type RenderedPostEntry = {
  id: string;
  rendered?: unknown;
};

/**
 * Markdownの変換に失敗した記事があればビルドを止める。
 *
 * Astroのglobローダーは変換エラーをログに出すだけで処理を続け、`rendered`が
 * 未設定の記事は本文が空のままページとして生成される。Mermaidの描画に使う
 * Chromiumが無い環境などで、空の記事を公開しないようにする。
 *
 * postsコレクションのglobローダーが、コンテンツ同期時にMarkdownを変換する
 * 前提に立つ。変換を後回しにする設定へ変えた場合は、この判定も見直す。
 */
export function assertPostsRendered(posts: readonly RenderedPostEntry[]): void {
  const failedIds = posts.filter((post) => post.rendered === undefined).map((post) => post.id);

  if (failedIds.length > 0) {
    throw new Error(`Markdownの変換に失敗した記事があります: ${failedIds.join(", ")}`);
  }
}
