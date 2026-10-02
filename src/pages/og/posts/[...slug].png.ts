import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

import { createOgImagePng, OG_IMAGE_COPY, resolveOgImageAssetPaths } from "@/lib/og-image";
import { isPublishedPost } from "@/lib/posts";

const publishedPosts = getCollection("posts", isPublishedPost);

export async function getStaticPaths() {
  const posts = await publishedPosts;

  return posts.map((post) => ({ params: { slug: post.id } }));
}

export const GET: APIRoute = async ({ params }) => {
  const posts = await publishedPosts;
  const post = posts.find(({ id }) => id === params.slug);

  if (!post) {
    return new Response(null, { status: 404 });
  }

  const png = await createOgImagePng({
    content: {
      kind: "article",
      publishedAt: post.data.date,
      title: post.data.title,
      url: OG_IMAGE_COPY.url,
    },
    ...resolveOgImageAssetPaths(),
  });

  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
