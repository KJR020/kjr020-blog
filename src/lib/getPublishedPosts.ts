import { getCollection } from "astro:content";
import type { PostSummary } from "@/components/pages/types";
import { createExcerpt } from "@/lib/postSummary";
import { isPublishedPost, sortPostsByNewest } from "@/lib/posts";

/** 公開済みの記事を新しい順に返し、一覧で使う派生情報を付ける */
export async function getPublishedPostSummaries(): Promise<PostSummary[]> {
  const posts = sortPostsByNewest(await getCollection("posts", isPublishedPost));
  return posts.map((post) => ({
    id: post.id,
    data: post.data,
    excerpt: post.data.description ?? createExcerpt(post.body ?? ""),
  }));
}
