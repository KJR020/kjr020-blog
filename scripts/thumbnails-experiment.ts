#!/usr/bin/env tsx

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createCardImageWebp, createThumbnailSpec, renderCachedImage } from "../src/lib/generated-images";

const cacheDirectory = await mkdtemp(join(tmpdir(), "kjr020-thumbnail-experiment-"));
try {
  const baseSpec = createThumbnailSpec({
    articleId: "experiment/example",
    publishedAt: "2026-09-14T00:00:00Z",
    tags: ["React", "TypeScript"],
    title: "サムネイル生成の実験",
  });
  const changedSpec = createThumbnailSpec({
    articleId: "experiment/example",
    publishedAt: "2026-09-14T00:00:00Z",
    tags: ["React", "TypeScript"],
    title: "タイトル変更の実験",
  });
  const changedCardTemplate = createThumbnailSpec(baseSpec.input, { "card-sm": "card-v2" });
  const options = {
    cacheDirectory,
    extension: "webp" as const,
    height: baseSpec.cardSmall.height,
    key: baseSpec.cardSmall.key,
    preset: "card-sm",
    render: () => createCardImageWebp(baseSpec.input, "card-sm"),
    width: baseSpec.cardSmall.width,
  };
  const first = await renderCachedImage(options);
  const second = await renderCachedImage(options);
  const changed = await renderCachedImage({
    ...options,
    key: changedSpec.cardSmall.key,
    render: () => createCardImageWebp(changedSpec.input, "card-sm"),
  });
  console.log(JSON.stringify({
    cardTemplateChanged: changedCardTemplate.cardSmall.key !== baseSpec.cardSmall.key,
    cardTemplateKeepsOgp: changedCardTemplate.ogp.key === baseSpec.ogp.key,
    changed: changed.status,
    first: first.status,
    second: second.status,
  }));
} finally {
  await rm(cacheDirectory, { recursive: true, force: true });
}
