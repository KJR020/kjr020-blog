import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

import {
  createCardImageWebp,
  createPostThumbnailInput,
  createThumbnailSpec,
  renderCachedImage,
} from "@/lib/generated-images";

const cacheDirectory = `${process.cwd()}/.cache/generated-images`;

export async function getStaticPaths() {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  return posts.flatMap((post) => {
    const input = createPostThumbnailInput(post);
    const spec = createThumbnailSpec(input);
    return [
      { params: { key: spec.cardSmall.key }, props: { spec, preset: "card-sm" as const } },
      { params: { key: spec.cardLarge.key }, props: { spec, preset: "card-lg" as const } },
    ];
  });
}

export const GET: APIRoute = async ({ props }) => {
  const { preset, spec } = props as Awaited<ReturnType<typeof getStaticPaths>>[number]["props"];
  const input = spec.input;
  const reference = preset === "card-sm" ? spec.cardSmall : spec.cardLarge;
  const result = await renderCachedImage({
    cacheDirectory,
    extension: "webp",
    height: reference.height,
    key: reference.key,
    preset,
    render: () => createCardImageWebp(input, preset),
    width: reference.width,
  });
  const image = await import("node:fs/promises").then(({ readFile }) => readFile(result.imagePath));
  return new Response(new Uint8Array(image), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/webp",
    },
  });
};
