import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildGenerationKey } from "./keys";
import { getLogoDigest, resolveLogoIds } from "./logos";
import type {
  GeneratedImageReference,
  NormalizedThumbnailInput,
  ThumbnailInput,
  ThumbnailSpec,
} from "./types";

export const THUMBNAIL_DIMENSIONS = {
  "card-lg": { format: "webp", height: 540, quality: 80, width: 960 },
  "card-sm": { format: "webp", height: 270, quality: 80, width: 480 },
  ogp: { format: "png", height: 630, quality: undefined, width: 1200 },
} as const;

export const THUMBNAIL_TEMPLATE_VERSIONS = {
  "card-lg": "card-v1",
  "card-sm": "card-v1",
  ogp: "ogp-v2",
} as const;

function packageVersion(packageName: string): string {
  const packageJson = JSON.parse(
    readFileSync(join(process.cwd(), "node_modules", packageName, "package.json"), "utf8"),
  ) as { version: string };
  return packageJson.version;
}

const RENDERER_VERSIONS = {
  satori: packageVersion("satori"),
  sharp: packageVersion("sharp"),
} as const;

function fileDigest(relativePath: string): string {
  return createHash("sha256")
    .update(readFileSync(join(process.cwd(), relativePath)))
    .digest("hex");
}

function getDependencyDigests() {
  return {
    font: fileDigest("src/assets/og/NotoSansJP-Bold.otf"),
    photo: fileDigest("src/assets/og/kuri-cutout.png"),
    commonSource: fileDigest("src/lib/generated-images/tokens.ts"),
    ogpSource: [
      "src/lib/generated-images/ogp-render.ts",
      "src/lib/og-image/template.tsx",
      "src/lib/og-image/layout.ts",
      "src/lib/siteCopy.ts",
    ]
      .map(fileDigest)
      .join(":"),
    cardSource: fileDigest("src/lib/generated-images/render.tsx"),
    tokens: fileDigest("src/lib/generated-images/tokens.ts"),
  } as const;
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").trim();
}

function normalizeDate(value: Date | string | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid thumbnail date: ${String(value)}`);
  return date.toISOString();
}

export function normalizeThumbnailInput(input: ThumbnailInput): NormalizedThumbnailInput {
  const tags: string[] = [];
  for (const rawTag of input.tags ?? []) {
    const tag = normalizeText(rawTag);
    if (tag && !tags.some((existing) => existing.toLowerCase() === tag.toLowerCase()))
      tags.push(tag);
  }

  const category = input.category ? normalizeText(input.category) : undefined;
  return {
    articleId: normalizeText(input.articleId),
    ...(category ? { category } : {}),
    ...(normalizeDate(input.publishedAt) ? { publishedAt: normalizeDate(input.publishedAt) } : {}),
    tags,
    title: normalizeText(input.title),
  };
}

function createReference(
  purpose: "card" | "ogp",
  preset: keyof typeof THUMBNAIL_DIMENSIONS,
  input: NormalizedThumbnailInput,
  templateVersion: string = THUMBNAIL_TEMPLATE_VERSIONS[preset],
): GeneratedImageReference {
  const dimensions = THUMBNAIL_DIMENSIONS[preset];
  const logoIds = resolveLogoIds(input.tags);
  const dependencyDigests = getDependencyDigests();
  const key = buildGenerationKey({
    articleId: input.articleId,
    category: input.category,
    dependencies: {
      commonSource: dependencyDigests.commonSource,
      font: dependencyDigests.font,
      photo: dependencyDigests.photo,
      renderer: JSON.stringify(RENDERER_VERSIONS),
      ...(purpose === "ogp"
        ? { template: dependencyDigests.ogpSource }
        : { template: dependencyDigests.cardSource }),
      tokens: dependencyDigests.tokens,
    },
    dimensions: { height: dimensions.height, width: dimensions.width },
    environment: `${process.platform}-${process.arch}-node${process.versions.node.split(".")[0]}`,
    format: dimensions.format,
    logoAssets: logoIds.map((id) => ({ digest: getLogoDigest(id), id })),
    preset,
    ...(purpose === "ogp" ? { publishedAt: input.publishedAt } : {}),
    purpose,
    quality: dimensions.quality,
    renderer: RENDERER_VERSIONS,
    tags: input.tags,
    templateVersion,
    title: input.title,
  });
  const extension = dimensions.format;
  return {
    format: extension,
    height: dimensions.height,
    key,
    url: `/generated-images/${purpose}/${key}.${extension}`,
    width: dimensions.width,
  };
}

export function createThumbnailSpec(
  input: ThumbnailInput,
  templateVersions?: Partial<Record<keyof typeof THUMBNAIL_TEMPLATE_VERSIONS, string>>,
): ThumbnailSpec {
  const normalized = normalizeThumbnailInput(input);
  return {
    cardLarge: createReference("card", "card-lg", normalized, templateVersions?.["card-lg"]),
    cardSmall: createReference("card", "card-sm", normalized, templateVersions?.["card-sm"]),
    input: normalized,
    ogp: createReference("ogp", "ogp", normalized, templateVersions?.ogp),
  };
}
