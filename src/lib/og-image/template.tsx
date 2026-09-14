import { readFile } from "node:fs/promises";

import satori, { type Font } from "satori";
import sharp from "sharp";
import { getLogoDataUrl } from "../generated-images/logos";
import { HOME_DESCRIPTION_LINES } from "../siteCopy";
import {
  BASE_FONT_SIZE,
  createArticleTitleLayout,
  DISPLAY_FONT_SIZE,
  OG_IMAGE_SIZE,
  OG_IMAGE_SPACING,
  type OgImageLayoutOverrides,
  PHI,
  PHI_EIGHTH_STEP,
  PHI_HALF_STEP,
  resolveOgImageLayout,
} from "./layout";

export const OG_IMAGE_COPY = {
  title: "KJR020's Blog",
  description: HOME_DESCRIPTION_LINES[0],
  url: "kjr020.dev",
} as const;

export type OgImageContent =
  | {
      kind: "site";
    }
  | {
      kind: "article";
      publishedAt: Date | string;
      title: string;
      url: string;
    };

export type OgImageSourceOptions = {
  content?: OgImageContent;
  layout?: OgImageLayoutOverrides;
  logoIds?: string[];
  photoPath: string;
  sansBoldFontPath: string;
};

const SITE_OG_IMAGE_CONTENT: OgImageContent = { kind: "site" };

function createFonts(sansBoldFont: Buffer): Font[] {
  return [{ name: "Noto Sans JP", data: sansBoldFont, weight: 700, style: "normal" }];
}

function formatPublishedDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("ja-JP", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Tokyo",
    year: "numeric",
  }).format(date);
}

export async function createOgImageSvg({
  content = SITE_OG_IMAGE_CONTENT,
  layout: layoutOverrides,
  logoIds = [],
  photoPath,
  sansBoldFontPath,
}: OgImageSourceOptions): Promise<string> {
  const [photo, sansBoldFont] = await Promise.all([
    readFile(photoPath),
    readFile(sansBoldFontPath),
  ]);
  const photoDataUrl = `data:image/png;base64,${photo.toString("base64")}`;
  const isArticle = content.kind === "article";
  const brand = isArticle ? OG_IMAGE_COPY.title : undefined;
  const headline = isArticle ? content.title : OG_IMAGE_COPY.title;
  const subheadline = isArticle ? undefined : OG_IMAGE_COPY.description;
  const publishedDate = isArticle ? formatPublishedDate(content.publishedAt) : undefined;
  const siteUrl = isArticle ? content.url : OG_IMAGE_COPY.url;
  const layout = resolveOgImageLayout(layoutOverrides);
  const cardWidth = OG_IMAGE_SIZE.width - layout.cardMargin * 2;
  const cardHeight = OG_IMAGE_SIZE.height - layout.cardMargin * 2;
  const mascotWidth = layout.mascotWidth;
  const mascotHeight = Math.round(mascotWidth / PHI_EIGHTH_STEP);
  const siteHeadlineWidth =
    cardWidth - layout.contentLeft - OG_IMAGE_SPACING.lg - mascotWidth - OG_IMAGE_SPACING.md;
  const articleHeadlineWidth = cardWidth - layout.contentLeft - layout.articleRightInset;
  const articleTitleLayout = isArticle
    ? createArticleTitleLayout(content.title, articleHeadlineWidth)
    : undefined;
  const headlineFontSize = articleTitleLayout?.fontSize ?? DISPLAY_FONT_SIZE;
  const headlineWidth = isArticle ? articleHeadlineWidth : siteHeadlineWidth;
  const siteSubheadlineTop =
    layout.siteHeadlineTop + Math.round(DISPLAY_FONT_SIZE * PHI_HALF_STEP) + OG_IMAGE_SPACING.sm;
  const metadataFontSize = Math.round(BASE_FONT_SIZE * PHI_HALF_STEP);
  const separatorTop = isArticle ? layout.articleSeparatorTop : layout.siteSeparatorTop;
  const metadataTop = separatorTop + OG_IMAGE_SPACING.md;

  return satori(
    <div
      style={{
        alignItems: "center",
        background: "#f8fafc",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          border: "2px solid #e2e8f0",
          borderRadius: OG_IMAGE_SPACING.sm,
          boxShadow: `0 ${OG_IMAGE_SPACING.sm}px ${OG_IMAGE_SPACING.xl}px rgba(15, 23, 42, 0.08)`,
          display: "flex",
          height: cardHeight,
          overflow: "hidden",
          position: "relative",
          width: cardWidth,
        }}
      >
        <div
          style={{
            background: "#2563eb",
            borderRadius: OG_IMAGE_SPACING.xs,
            display: "flex",
            height: cardHeight - OG_IMAGE_SPACING.lg * 2,
            left: OG_IMAGE_SPACING.md,
            position: "absolute",
            top: OG_IMAGE_SPACING.lg,
            width: Math.round(OG_IMAGE_SPACING.xs / PHI_HALF_STEP),
          }}
        />

        {brand && (
          <div
            data-og-role="brand"
            style={{
              color: "#2563eb",
              display: "flex",
              fontFamily: "Noto Sans JP",
              fontSize: Math.round(BASE_FONT_SIZE * PHI),
              fontWeight: 700,
              left: layout.contentLeft,
              letterSpacing: "-0.02em",
              lineHeight: PHI_HALF_STEP,
              position: "absolute",
              top: layout.articleBrandTop,
              whiteSpace: "nowrap",
            }}
          >
            {brand}
          </div>
        )}

        <div
          data-og-role="headline"
          lang="ja-JP"
          style={{
            color: "#0f172a",
            display: "flex",
            flexDirection:
              articleTitleLayout && articleTitleLayout.lines.length > 1 ? "column" : "row",
            fontFamily: "Noto Sans JP",
            fontSize: headlineFontSize,
            fontWeight: 700,
            height:
              separatorTop -
              (isArticle ? layout.articleHeadlineTop : layout.siteHeadlineTop) -
              OG_IMAGE_SPACING.md,
            left: layout.contentLeft,
            letterSpacing: "-0.022em",
            lineHeight: PHI_HALF_STEP,
            overflow: "hidden",
            position: "absolute",
            top: isArticle ? layout.articleHeadlineTop : layout.siteHeadlineTop,
            width: headlineWidth,
          }}
        >
          {articleTitleLayout && articleTitleLayout.lines.length > 1
            ? articleTitleLayout.lines.map((line) => (
                <div key={line} style={{ display: "flex", whiteSpace: "nowrap" }}>
                  {line}
                </div>
              ))
            : headline}
        </div>

        {subheadline && (
          <div
            data-og-role="subheadline"
            lang="ja-JP"
            style={{
              color: "#475569",
              display: "flex",
              fontFamily: "Noto Sans JP",
              fontSize: Math.round(BASE_FONT_SIZE * PHI),
              fontWeight: 700,
              left: layout.contentLeft,
              lineHeight: PHI_HALF_STEP,
              position: "absolute",
              top: siteSubheadlineTop,
              whiteSpace: "nowrap",
            }}
          >
            {subheadline}
          </div>
        )}

        <div
          data-og-role="separator"
          style={{
            background: "#e2e8f0",
            display: "flex",
            height: 2,
            left: layout.contentLeft,
            position: "absolute",
            top: separatorTop,
            width: siteHeadlineWidth,
          }}
        />

        <div
          data-og-role="metadata"
          style={{
            alignItems: "center",
            color: "#64748b",
            display: "flex",
            fontFamily: "Noto Sans JP",
            fontSize: metadataFontSize,
            fontWeight: 700,
            left: layout.contentLeft,
            lineHeight: PHI_HALF_STEP,
            position: "absolute",
            top: metadataTop,
          }}
        >
          {publishedDate && (
            <>
              <div style={{ display: "flex", whiteSpace: "nowrap" }}>{publishedDate}</div>
              <div
                style={{
                  background: "#e2e8f0",
                  display: "flex",
                  height: OG_IMAGE_SPACING.md,
                  margin: `0 ${OG_IMAGE_SPACING.md}px`,
                  width: 2,
                }}
              />
            </>
          )}
          {logoIds.length > 0 && (
            <div
              data-og-role="logos"
              style={{ alignItems: "center", display: "flex", gap: OG_IMAGE_SPACING.xs }}
            >
              {logoIds.slice(0, 3).map((logoId) => (
                <img alt="" height={28} key={logoId} src={getLogoDataUrl(logoId)} width={28} />
              ))}
            </div>
          )}
          <div
            data-og-role="url"
            style={{
              color: "#2563eb",
              display: "flex",
              fontFamily: "Noto Sans JP",
              fontSize: metadataFontSize,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {siteUrl}
          </div>
        </div>

        <img
          alt=""
          data-og-role="mascot"
          height={mascotHeight}
          src={photoDataUrl}
          style={{
            bottom: OG_IMAGE_SPACING.md,
            objectFit: "contain",
            position: "absolute",
            right: OG_IMAGE_SPACING.lg,
          }}
          width={mascotWidth}
        />
      </div>
    </div>,
    {
      ...OG_IMAGE_SIZE,
      fonts: createFonts(sansBoldFont),
      pointScaleFactor: 2,
    },
  );
}

export async function createOgImagePng(options: OgImageSourceOptions): Promise<Buffer> {
  const svg = await createOgImageSvg(options);

  return sharp(Buffer.from(svg))
    .png({ adaptiveFiltering: false, compressionLevel: 9, palette: false })
    .toBuffer();
}
