type DraftablePost = {
  data: {
    draft?: boolean;
  };
};

type DatedPost = {
  data: {
    date: Date;
  };
};

/** 下書きではない、公開対象の記事かを判定する。 */
export function isPublishedPost(post: DraftablePost): boolean {
  return !post.data.draft;
}

/** 公開日の新しい順に並べた配列を返す。元の配列は変更しない。 */
export function sortPostsByNewest<TPost extends DatedPost>(posts: readonly TPost[]): TPost[] {
  return [...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
