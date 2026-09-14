#!/usr/bin/env tsx

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

type Reference = { format: string; height: number; url: string; width: number };
type Manifest = Record<string, { card: { large: Reference; small: Reference }; ogp: Reference }>;

const projectRoot = process.cwd();
const distDirectory = join(projectRoot, "dist");
const manifestPath = join(distDirectory, "generated-images-manifest.json");
if (!existsSync(manifestPath)) throw new Error(`Missing generated thumbnail manifest: ${manifestPath}`);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
const references = Object.values(manifest).flatMap(({ card, ogp }) => [card.small, card.large, ogp]);
let totalBytes = 0;
for (const reference of references) {
  const relativePath = reference.url.replace(/^\//, "");
  const imagePath = join(distDirectory, relativePath);
  if (!existsSync(imagePath)) throw new Error(`Missing generated thumbnail: ${relativePath}`);
  const metadata = await sharp(imagePath).metadata();
  totalBytes += statSync(imagePath).size;
  if (metadata.format !== reference.format || metadata.width !== reference.width || metadata.height !== reference.height) {
    throw new Error(`Unexpected thumbnail metadata: ${relativePath}`);
  }
}

const imageCount = ["card", "ogp"].flatMap((purpose) => {
  const directory = join(distDirectory, "generated-images", purpose);
  return existsSync(directory) ? readdirSync(directory).filter((file) => !file.endsWith(".map")) : [];
}).length;
if (imageCount !== references.length) throw new Error(`Manifest image count ${references.length} does not match output count ${imageCount}`);
console.log(JSON.stringify({ bytes: totalBytes, images: imageCount, publicPosts: Object.keys(manifest).length }));
