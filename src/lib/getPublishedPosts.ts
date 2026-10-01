import { getCollection } from "astro:content";
import type { PostSummary } from "@/components/pages/types";
import { createExcerpt } from "@/lib/postSummary";

/** 公開済みの記事を新しい順に返し、一覧で使う派生情報を付ける */
export async function getPublishedPostSummaries(): Promise<PostSummary[]> {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  return posts
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .map((post) => ({
      id: post.id,
      data: post.data,
      excerpt: post.data.description ?? createExcerpt(post.body ?? ""),
    }));
}
