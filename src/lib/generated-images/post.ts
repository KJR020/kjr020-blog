import type { ThumbnailInput } from "./types";

type PostLike = {
  data: {
    category?: string;
    date: Date;
    tags?: string[];
    title: string;
  };
  id: string;
};

export function createPostThumbnailInput(post: PostLike): ThumbnailInput {
  return {
    articleId: post.id,
    category: post.data.category,
    publishedAt: post.data.date,
    tags: post.data.tags,
    title: post.data.title,
  };
}
