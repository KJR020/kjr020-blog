import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

import * as ogImageModule from ".";
import {
  createArticleTitleLayout,
  createOgImageSvg,
  generateOgImage,
  OG_IMAGE_COPY,
  OG_IMAGE_SIZE,
} from ".";

const temporaryDirectories: string[] = [];
const ogAssetDirectory = join(process.cwd(), "src", "assets", "og");
const ogImageSourcePath = join(process.cwd(), "src", "lib", "og-image", "template.tsx");

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "kjr020-og-image-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe("OG image content", () => {
  it("organizes the OGP implementation by responsibility", () => {
    const ogImageDirectory = join(process.cwd(), "src", "lib", "og-image");
    const expectedFiles = ["generate.ts", "index.ts", "layout.ts", "template.tsx"];

    expect(expectedFiles.every((fileName) => existsSync(join(ogImageDirectory, fileName)))).toBe(
      true,
    );
  });

  it("derives the spacing ladder from the golden ratio", () => {
    const spacing = (
      ogImageModule as typeof ogImageModule & {
        OG_IMAGE_SPACING?: Record<string, number>;
      }
    ).OG_IMAGE_SPACING;

    expect(spacing).toBeDefined();

    const values = Object.values(spacing ?? {});
    expect(values).toEqual([14, 22, 36, 58, 93, 151]);

    for (let index = 1; index < values.length; index += 1) {
      expect(values[index] / values[index - 1]).toBeCloseTo(1.618, 1);
    }
  });

  it("uses the current home page copy without the legacy technology list", () => {
    expect(OG_IMAGE_COPY).toEqual({
      title: "KJR020's Blog",
      description: "とあるWebエンジニアのブログ。",
      url: "kjr020.dev",
    });

    expect(JSON.stringify(OG_IMAGE_COPY)).not.toContain("Astro");
    expect(JSON.stringify(OG_IMAGE_COPY)).not.toContain("Knowledge Graph");
  });

  it("shares the home page description source with the OGP template", async () => {
    const homePageSource = await readFile(
      join(process.cwd(), "src", "components", "pages", "HomePage.astro"),
      "utf8",
    );

    expect(homePageSource).toContain('import { HOME_DESCRIPTION_LINES } from "@/lib/siteCopy";');
    expect(homePageSource).not.toContain("とあるWebエンジニアのブログ。");
    expect(homePageSource).not.toContain("調べたこと、やってみたことを書いています。");
  });

  it("uses a brand, headline, separator, metadata, and mascot hierarchy", async () => {
    const source = await readFile(ogImageSourcePath, "utf8");
    const roles = ["brand", "headline", "subheadline", "separator", "metadata", "mascot"];
    const rolePositions = roles.map((role) => source.indexOf(`data-og-role="${role}"`));

    expect(rolePositions.every((position) => position >= 0)).toBe(true);
    expect(rolePositions).toEqual([...rolePositions].sort((left, right) => left - right));
    expect(source).toContain('content.kind === "article"');
    expect(source).toContain(": headline}");
    expect(source).toContain("{subheadline}");
    expect(source).toContain("{publishedDate}");
    expect(source).toContain("const headline = isArticle ? content.title : OG_IMAGE_COPY.title;");
    expect(source).toContain(
      "const subheadline = isArticle ? undefined : OG_IMAGE_COPY.description;",
    );

    const urlStart = source.indexOf('data-og-role="url"');
    const urlEnd = source.indexOf("{siteUrl}", urlStart);
    const urlMarkup = source.slice(urlStart, urlEnd);

    expect(urlMarkup).not.toContain("background:");
    expect(urlMarkup).not.toContain("border:");
    expect(urlMarkup).not.toContain("borderRadius:");
    expect(urlMarkup).not.toContain("padding:");
    expect(urlMarkup).toContain('fontFamily: "Noto Sans JP"');
    expect(urlMarkup).not.toContain('fontFamily: "JetBrains Mono"');
  });

  it("aligns the main OGP layout anchors to an 8px grid", () => {
    const layout = (
      ogImageModule as typeof ogImageModule & {
        OG_IMAGE_LAYOUT?: Record<string, number>;
      }
    ).OG_IMAGE_LAYOUT;

    expect(layout).toBeDefined();
    expect(layout).toEqual({
      articleBrandTop: 128,
      articleHeadlineTop: 168,
      articleRightInset: 56,
      articleSeparatorTop: 400,
      cardMargin: 32,
      contentLeft: 96,
      mascotWidth: 256,
      siteHeadlineTop: 128,
      siteSeparatorTop: 408,
    });

    for (const value of Object.values(layout ?? {})) {
      expect(value % 8).toBe(0);
    }
  });

  it("resolves preview-only layout overrides without mutating the template defaults", () => {
    const resolveOgImageLayout = (
      ogImageModule as typeof ogImageModule & {
        resolveOgImageLayout?: (overrides?: Record<string, number>) => Record<string, number>;
      }
    ).resolveOgImageLayout;

    expect(resolveOgImageLayout).toBeDefined();

    const defaults = resolveOgImageLayout?.();
    const preview = resolveOgImageLayout?.({
      articleBrandTop: 136,
      articleHeadlineTop: 129,
      articleRightInset: 286,
      cardMargin: 36,
      siteHeadlineTop: 151,
    });

    expect(preview).toMatchObject({
      articleBrandTop: 136,
      articleHeadlineTop: 129,
      articleRightInset: 286,
      cardMargin: 36,
      siteHeadlineTop: 151,
    });
    expect(resolveOgImageLayout?.()).toEqual(defaults);
  });

  it("keeps a quoted work title and its trailing phrase together on one line", () => {
    const createArticleTitleLayout = (
      ogImageModule as typeof ogImageModule & {
        createArticleTitleLayout?: (title: string) => {
          fontSize: number;
          lines: string[];
        };
      }
    ).createArticleTitleLayout;

    expect(createArticleTitleLayout).toBeDefined();

    const layout = createArticleTitleLayout?.(
      "AI時代にUX設計を学ぶため、『The Elements of User Experience』を読んだ",
    );

    expect(layout?.lines).toEqual([
      "AI時代にUX設計を学ぶため、",
      "『The Elements of User Experience』を読んだ",
    ]);
    expect(layout?.fontSize).toBe(42);
  });

  it("splits a long unquoted title into lines that fit the available width", () => {
    const title = "業務フローを整理せずテーブル設計をしようとして失敗した話";
    const availableWidth = 984;
    const layout = createArticleTitleLayout(title, availableWidth);

    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.lines.length).toBeLessThanOrEqual(3);
    expect(layout.lines.join("")).toBe(title);

    for (const line of layout.lines) {
      expect(Array.from(line).length * layout.fontSize).toBeLessThanOrEqual(availableWidth);
    }
  });
});

describe("generateOgImage", () => {
  it("renders distinct site and article variants from the shared template", async () => {
    const sourceOptions = {
      photoPath: join(ogAssetDirectory, "kuri-cutout.png"),
      sansBoldFontPath: join(ogAssetDirectory, "NotoSansJP-Bold.otf"),
    };
    const articleOptions = {
      ...sourceOptions,
      content: {
        kind: "article" as const,
        publishedAt: new Date("2026-08-26T00:00:00+09:00"),
        title: "AI時代にUX設計を学ぶため、『The Elements of User Experience』を読んだ",
        url: "kjr020.dev",
      },
    };

    const [siteSvg, articleSvg] = await Promise.all([
      createOgImageSvg(sourceOptions),
      createOgImageSvg(articleOptions),
    ]);

    expect(articleSvg).not.toBe(siteSvg);
  });

  it("generates a deterministic 1200 by 630 PNG", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const firstOutputPath = join(temporaryDirectory, "first.png");
    const secondOutputPath = join(temporaryDirectory, "second.png");
    const options = {
      photoPath: join(ogAssetDirectory, "kuri-cutout.png"),
      sansBoldFontPath: join(ogAssetDirectory, "NotoSansJP-Bold.otf"),
    };

    await generateOgImage({ ...options, outputPath: firstOutputPath });
    await generateOgImage({ ...options, outputPath: secondOutputPath });

    const metadata = await sharp(firstOutputPath).metadata();
    const [firstImage, secondImage] = await Promise.all([
      readFile(firstOutputPath),
      readFile(secondOutputPath),
    ]);

    expect(OG_IMAGE_SIZE).toEqual({ width: 1200, height: 630 });
    expect(metadata).toMatchObject({ format: "png", width: 1200, height: 630 });
    expect(firstImage.equals(secondImage)).toBe(true);
  });

  it("is connected to the project prebuild command", async () => {
    const [packageJsonSource, prebuildSource] = await Promise.all([
      readFile(join(process.cwd(), "package.json"), "utf8"),
      readFile(join(process.cwd(), "scripts", "prepare-public-build.ts"), "utf8"),
    ]);
    const packageJson = JSON.parse(packageJsonSource);

    expect(packageJson.scripts["generate:og-image"]).toBe("tsx scripts/generate-og-image.ts");
    expect(packageJson.scripts.prebuild).toBe("tsx scripts/prepare-public-build.ts");
    expect(prebuildSource).toContain('import { generateOgImage } from "../src/lib/og-image";');
    expect(prebuildSource).toContain(
      'outputPath: path.join(projectRoot, "public", "og-image.png")',
    );
  });
});
