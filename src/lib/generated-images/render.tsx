import satori from "satori";
import sharp from "sharp";

import { getLogoDataUrl, resolveLogoIds } from "./logos";
import { THUMBNAIL_DIMENSIONS } from "./spec";
import { THUMBNAIL_RENDER_TOKENS } from "./tokens";
import type { NormalizedThumbnailInput } from "./types";

export async function createCardImageWebp(
  input: NormalizedThumbnailInput,
  preset: "card-sm" | "card-lg",
): Promise<Buffer> {
  const dimensions = THUMBNAIL_DIMENSIONS[preset];
  const logoIds = resolveLogoIds(input.tags);
  const logoSize = Math.round(dimensions.width * 0.2);
  const logoGap = Math.round(dimensions.width * 0.03);
  const logos = logoIds.map((id) => getLogoDataUrl(id));
  const svg = await satori(
    <div
      style={{
        alignItems: "center",
        background: THUMBNAIL_RENDER_TOKENS.background,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: logoGap,
          justifyContent: "center",
          width: "80%",
        }}
      >
        {logos.length > 0 ? (
          logos
            .slice(0, 3)
            .map((src) => <img alt="" height={logoSize} key={src} src={src} width={logoSize} />)
        ) : (
          <div
            style={{
              background: "#64748b",
              borderRadius: 999,
              display: "flex",
              height: logoSize,
              width: logoSize,
            }}
          />
        )}
      </div>
    </div>,
    {
      height: dimensions.height,
      width: dimensions.width,
      fonts: [],
      pointScaleFactor: 2,
    },
  );

  return sharp(Buffer.from(svg)).webp({ quality: dimensions.quality }).toBuffer();
}
