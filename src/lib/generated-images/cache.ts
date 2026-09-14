import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

export type CachedImageOptions = {
  cacheDirectory: string;
  extension: "png" | "webp";
  height: number;
  key: string;
  preset: string;
  render: () => Promise<Buffer>;
  width: number;
};

export type CachedImageResult = {
  bytes: number;
  imagePath: string;
  status: "HIT" | "MISS";
};

type CacheMetadata = {
  bytes: number;
  digest: string;
  format: string;
  height: number;
  width: number;
};

function digest(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function readValidCache(
  imagePath: string,
  metadataPath: string,
  options: CachedImageOptions,
): Promise<number | undefined> {
  try {
    const [image, metadata] = await Promise.all([
      readFile(imagePath),
      readFile(metadataPath, "utf8").then((value) => JSON.parse(value) as CacheMetadata),
    ]);
    const imageMetadata = await sharp(image).metadata();
    if (
      metadata.bytes !== image.byteLength ||
      metadata.digest !== digest(image) ||
      metadata.format !== options.extension ||
      metadata.width !== options.width ||
      metadata.height !== options.height ||
      imageMetadata.format !== options.extension ||
      imageMetadata.width !== options.width ||
      imageMetadata.height !== options.height
    )
      return undefined;
    return image.byteLength;
  } catch {
    return undefined;
  }
}

export async function renderCachedImage(options: CachedImageOptions): Promise<CachedImageResult> {
  const directory = join(options.cacheDirectory, options.extension);
  const imagePath = join(directory, `${options.key}.${options.extension}`);
  const metadataPath = join(directory, `${options.key}.json`);
  const startedAt = performance.now();
  const cachedBytes = await readValidCache(imagePath, metadataPath, options);
  if (cachedBytes !== undefined) {
    console.info(
      JSON.stringify({
        bytes: cachedBytes,
        key: options.key,
        layer: "generation",
        lookupMs: Math.round(performance.now() - startedAt),
        preset: options.preset,
        renderMs: 0,
        status: "HIT",
        totalMs: Math.round(performance.now() - startedAt),
      }),
    );
    return { bytes: cachedBytes, imagePath, status: "HIT" };
  }

  const renderStartedAt = performance.now();
  const image = await options.render();
  const renderMs = Math.round(performance.now() - renderStartedAt);
  const metadata = await sharp(image).metadata();
  if (
    metadata.format !== options.extension ||
    metadata.width !== options.width ||
    metadata.height !== options.height
  ) {
    throw new Error(`Generated thumbnail has unexpected dimensions or format: ${options.key}`);
  }
  await mkdir(directory, { recursive: true });
  const suffix = `${process.pid}-${Date.now()}`;
  await writeFile(`${imagePath}.${suffix}.tmp`, image);
  await writeFile(
    `${metadataPath}.${suffix}.tmp`,
    JSON.stringify({
      bytes: image.byteLength,
      digest: digest(image),
      format: metadata.format,
      height: metadata.height,
      width: metadata.width,
    } satisfies CacheMetadata),
  );
  await rename(`${imagePath}.${suffix}.tmp`, imagePath);
  await rename(`${metadataPath}.${suffix}.tmp`, metadataPath);
  console.info(
    JSON.stringify({
      bytes: image.byteLength,
      key: options.key,
      layer: "generation",
      lookupMs: Math.round(renderStartedAt - startedAt),
      preset: options.preset,
      renderMs,
      status: "MISS",
      totalMs: Math.round(performance.now() - startedAt),
    }),
  );
  return { bytes: image.byteLength, imagePath, status: "MISS" };
}
