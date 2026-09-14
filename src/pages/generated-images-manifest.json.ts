import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

import { createPostThumbnailInput, createThumbnailSpec } from "@/lib/generated-images";

export const GET: APIRoute = async () => {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  const manifest = Object.fromEntries(
    posts.map((post) => {
      const spec = createThumbnailSpec(createPostThumbnailInput(post));
      return [post.id, { card: { large: spec.cardLarge, small: spec.cardSmall }, ogp: spec.ogp }];
    }),
  );
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/json" },
  });
};
