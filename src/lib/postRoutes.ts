type PostRouteEntry = {
  id: string;
  data: {
    draft?: boolean;
  };
};

export function createPublishedPostStaticPaths<TPost extends PostRouteEntry>(
  posts: TPost[],
  includedDraftIds: readonly string[] = [],
) {
  return posts
    .filter((post) => !post.data.draft || includedDraftIds.includes(post.id))
    .map((post) => ({
      params: { slug: post.id },
      props: { post },
    }));
}
