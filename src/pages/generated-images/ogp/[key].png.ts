import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

import {
  createOgpImagePng,
  createPostThumbnailInput,
  createThumbnailSpec,
  renderCachedImage,
} from "@/lib/generated-images";

const cacheDirectory = `${process.cwd()}/.cache/generated-images`;

export async function getStaticPaths() {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  return posts.map((post) => {
    const input = createPostThumbnailInput(post);
    const spec = createThumbnailSpec(input);
    return { params: { key: spec.ogp.key }, props: { spec } };
  });
}

export const GET: APIRoute = async ({ props }) => {
  const { spec } = props as Awaited<ReturnType<typeof getStaticPaths>>[number]["props"];
  const input = spec.input;
  const result = await renderCachedImage({
    cacheDirectory,
    extension: "png",
    height: spec.ogp.height,
    key: spec.ogp.key,
    preset: "ogp",
    render: () => createOgpImagePng(input),
    width: spec.ogp.width,
  });
  const image = await import("node:fs/promises").then(({ readFile }) => readFile(result.imagePath));
  return new Response(new Uint8Array(image), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/png",
    },
  });
};
