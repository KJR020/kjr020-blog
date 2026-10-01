#!/usr/bin/env tsx

import path from "node:path";

import { generateOgImage, resolveOgImageAssetPaths } from "../src/lib/og-image";

// サイト共通のOGP画像を生成する。記事別のOGP画像はAstroのビルド時に生成する。
await generateOgImage({
  ...resolveOgImageAssetPaths(),
  outputPath: path.join(process.cwd(), "public", "og-image.png"),
});
