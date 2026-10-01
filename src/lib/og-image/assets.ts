import path from "node:path";

import type { OgImageSourceOptions } from "./template";

type OgImageAssetPaths = Pick<OgImageSourceOptions, "photoPath" | "sansBoldFontPath">;

/**
 * OGP画像の生成に使う素材のパスを、プロジェクトルートを基準に解決する。
 *
 * ビルド前のスクリプトとAstroのビルドの両方から呼ぶため、呼び出し元のファイル位置ではなく
 * プロジェクトルートを基準にする。
 */
export function resolveOgImageAssetPaths(projectRoot: string = process.cwd()): OgImageAssetPaths {
  const assetDirectory = path.join(projectRoot, "src", "assets", "og");

  return {
    photoPath: path.join(assetDirectory, "kuri-cutout.png"),
    sansBoldFontPath: path.join(assetDirectory, "NotoSansJP-Bold.otf"),
  };
}
