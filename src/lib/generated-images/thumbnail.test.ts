import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildGenerationKey,
  createThumbnailSpec,
  getLogo,
  normalizeThumbnailInput,
  renderCachedImage,
  resolveLogoIds,
} from ".";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

async function createTemporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), "kjr020-thumbnail-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

describe("thumbnail input and generation keys", () => {
  it("normalizes tags without changing their first-seen order", () => {
    expect(
      normalizeThumbnailInput({
        articleId: "posts/example",
        title: "  タイトル  ",
        tags: [" TypeScript ", "typescript", "React", "ｅｘａｍｐｌｅ"],
      }),
    ).toMatchObject({
      articleId: "posts/example",
      title: "タイトル",
      tags: ["TypeScript", "React", "example"],
    });
  });

  it("keeps card and OGP keys independent while tracking title changes", () => {
    const base = createThumbnailSpec({
      articleId: "posts/example",
      title: "タイトル",
      tags: ["React"],
      publishedAt: "2026-09-14T00:00:00Z",
    });
    const changedTitle = createThumbnailSpec({
      articleId: "posts/example",
      title: "変更後",
      tags: ["React"],
      publishedAt: "2026-09-14T00:00:00Z",
    });

    expect(base.ogp.key).not.toBe(base.cardSmall.key);
    expect(base.cardSmall.key).not.toBe(base.cardLarge.key);
    expect(changedTitle.ogp.key).not.toBe(base.ogp.key);
    expect(changedTitle.cardSmall.key).not.toBe(base.cardSmall.key);

    const changedCardTemplate = createThumbnailSpec(
      {
        articleId: "posts/example",
        title: "タイトル",
        tags: ["React"],
        publishedAt: "2026-09-14T00:00:00Z",
      },
      { "card-sm": "card-v2", "card-lg": "card-v2" },
    );
    expect(changedCardTemplate.ogp.key).toBe(base.ogp.key);
    expect(changedCardTemplate.cardSmall.key).not.toBe(base.cardSmall.key);
  });

  it("invalidates images when a selected logo color changes", () => {
    const input = { articleId: "color", title: "色の変更", tags: ["React"] };
    const before = createThumbnailSpec(input);
    const logo = getLogo("react");
    const originalColor = logo.color;
    try {
      logo.color = "#000000";
      const after = createThumbnailSpec(input);
      expect(after.cardSmall.key).not.toBe(before.cardSmall.key);
      expect(after.ogp.key).not.toBe(before.ogp.key);
    } finally {
      logo.color = originalColor;
    }
  });

  it("maps aliases, removes duplicate logos, and caps the result at three", () => {
    expect(resolveLogoIds(["React", "ts", "TypeScript", "Astro", "Python", "未知"])).toEqual([
      "react",
      "typescript",
      "astro",
    ]);
  });

  it("changes the key when a selected logo asset changes", () => {
    const base = buildGenerationKey({
      purpose: "card",
      preset: "card-sm",
      title: "タイトル",
      tags: ["React"],
      logoAssets: [{ id: "react", digest: "a" }],
      templateVersion: "card-v1",
    });
    const changed = buildGenerationKey({
      purpose: "card",
      preset: "card-sm",
      title: "タイトル",
      tags: ["React"],
      logoAssets: [{ id: "react", digest: "b" }],
      templateVersion: "card-v1",
    });

    expect(changed).not.toBe(base);
  });
});

describe("renderCachedImage", () => {
  it("renders once, reports a HIT on the second call, and regenerates corruption", async () => {
    const cacheDirectory = await createTemporaryDirectory();
    const render = vi.fn(async () =>
      sharp({
        create: { channels: 4, background: "#ffffff", height: 270, width: 480 },
      })
        .webp()
        .toBuffer(),
    );
    const options = {
      cacheDirectory,
      key: "abc123",
      preset: "card-sm",
      extension: "webp" as const,
      width: 480,
      height: 270,
      render,
    };

    const first = await renderCachedImage(options);
    const second = await renderCachedImage(options);

    expect(first.status).toBe("MISS");
    expect(second.status).toBe("HIT");
    expect(render).toHaveBeenCalledTimes(1);

    await import("node:fs/promises").then(({ writeFile }) =>
      writeFile(first.imagePath, Buffer.from("corrupt")),
    );

    const repaired = await renderCachedImage(options);
    expect(repaired.status).toBe("MISS");
    expect(render).toHaveBeenCalledTimes(2);
  });
});
