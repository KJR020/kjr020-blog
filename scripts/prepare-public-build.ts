#!/usr/bin/env tsx

// `pnpm build` の前処理。前回の出力を消し、公開してはいけないファイルが公開入力に
// 混ざっていないかを検査してから、サイト共通のOGP画像を生成する。

import { readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { generateOgImage, resolveOgImageAssetPaths } from "../src/lib/og-image";
import { PUBLIC_BUILD_INPUT_DIRS, preparePublicBuild } from "../src/lib/publicBuildInputs";

const outputDir = "dist";

function listFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const filePath = path.join(directory, entry);
    const stats = statSync(filePath);
    return stats.isDirectory() ? listFiles(filePath) : [filePath];
  });
}

const forbiddenFiles = preparePublicBuild({
  publicInputDirs: PUBLIC_BUILD_INPUT_DIRS,
  outputDir,
  listFiles,
  removeOutputDir: (directory) => {
    rmSync(directory, { recursive: true, force: true });
  },
});

if (forbiddenFiles.length > 0) {
  console.error("Public build input check failed. Move these files outside public build inputs:");
  for (const filePath of forbiddenFiles) {
    console.error(`- ${filePath}`);
  }
  process.exit(1);
}

await generateOgImage({
  ...resolveOgImageAssetPaths(),
  outputPath: path.join(process.cwd(), "public", "og-image.png"),
});
