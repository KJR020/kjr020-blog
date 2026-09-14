import path from "node:path";

import { createOgImagePng } from "../og-image";
import { resolveLogoIds } from "./logos";
import type { NormalizedThumbnailInput } from "./types";

const projectRoot = process.cwd();

export async function createOgpImagePng(input: NormalizedThumbnailInput): Promise<Buffer> {
  return createOgImagePng({
    content: {
      kind: "article",
      publishedAt: input.publishedAt ?? new Date(0),
      title: input.title,
      url: "kjr020.dev",
    },
    logoIds: resolveLogoIds(input.tags),
    photoPath: path.join(projectRoot, "src", "assets", "og", "kuri-cutout.png"),
    sansBoldFontPath: path.join(projectRoot, "src", "assets", "og", "NotoSansJP-Bold.otf"),
  });
}
