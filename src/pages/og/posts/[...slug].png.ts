import { getCollection } from "astro:content";
import path from "node:path";
import type { APIRoute } from "astro";

import {
  createOgpImagePng,
  createPostThumbnailInput,
  createThumbnailSpec,
  renderCachedImage,
} from "@/lib/generated-images";

const projectRoot = process.cwd();
const publishedPosts = getCollection("posts", ({ data }) => !data.draft);

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

  const spec = createThumbnailSpec(createPostThumbnailInput(post));
  const result = await renderCachedImage({
    cacheDirectory: path.join(projectRoot, ".cache", "generated-images"),
    extension: "png",
    height: spec.ogp.height,
    key: spec.ogp.key,
    preset: "ogp",
    render: () => createOgpImagePng(spec.input),
    width: spec.ogp.width,
  });
  const png = await import("node:fs/promises").then(({ readFile }) => readFile(result.imagePath));

  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
