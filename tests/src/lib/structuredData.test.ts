import { describe, expect, it } from "vitest";
import { buildPageStructuredData, serializeJsonLd } from "@/lib/structuredData";

describe("buildPageStructuredData", () => {
  it("非記事ページでは WebSite と Person のみを生成する", () => {
    const structuredData = buildPageStructuredData({
      pageUrl: "https://kjr020.dev/",
      siteUrl: "https://kjr020.dev",
    });

    expect(structuredData).toMatchObject({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": "https://kjr020.dev/#website",
          url: "https://kjr020.dev/",
          name: "KJR020's Blog",
          description: "KJR020の技術ブログ",
          inLanguage: "ja",
          publisher: { "@id": "https://kjr020.dev/#person" },
        },
        {
          "@type": "Person",
          "@id": "https://kjr020.dev/#person",
          name: "KJR020",
          url: "https://kjr020.dev/",
          image: "https://kjr020.dev/images/kuri_photo.png",
        },
      ],
    });
    expect(structuredData["@graph"]).toHaveLength(2);
    expect(structuredData["@graph"].some((entry) => entry["@type"] === "BlogPosting")).toBe(false);
  });

  it("記事ページでは BlogPosting を生成し、dateModified は公開日にフォールバックする", () => {
    const structuredData = buildPageStructuredData({
      pageUrl: "https://kjr020.dev/posts/astro/astro-pagefind-search/",
      siteUrl: "https://kjr020.dev",
      article: {
        headline: "AstroにPagefind検索を追加した",
        description: "Astro製ブログにPagefind検索を追加した記録です。",
        datePublished: new Date("2026-01-20T09:30:00+09:00"),
        tags: ["Astro", "Search", "Astro"],
      },
    });

    expect(structuredData["@graph"]).toHaveLength(3);
    expect(structuredData["@graph"][2]).toEqual({
      "@type": "BlogPosting",
      "@id": "https://kjr020.dev/posts/astro/astro-pagefind-search/#blogposting",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": "https://kjr020.dev/posts/astro/astro-pagefind-search/",
      },
      headline: "AstroにPagefind検索を追加した",
      description: "Astro製ブログにPagefind検索を追加した記録です。",
      image: "https://kjr020.dev/og-image.png",
      datePublished: "2026-01-20T00:30:00.000Z",
      dateModified: "2026-01-20T00:30:00.000Z",
      author: { "@id": "https://kjr020.dev/#person" },
      publisher: { "@id": "https://kjr020.dev/#person" },
      keywords: ["Astro", "Search"],
      inLanguage: "ja",
      isPartOf: { "@id": "https://kjr020.dev/#website" },
    });
  });
});

describe("serializeJsonLd", () => {
  it("undefined を除外し、script 終了タグとして解釈されないようにエスケープする", () => {
    const serialized = serializeJsonLd({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "</script><script>alert('xss')</script>",
      description: undefined,
      author: {
        "@type": "Person",
        name: "KJR020",
        image: undefined,
      },
    });

    expect(serialized).not.toContain("undefined");
    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("<script>");
    expect(serialized).toContain("\\u003C/script\\u003E");
    expect(JSON.parse(serialized)).toEqual({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "</script><script>alert('xss')</script>",
      author: {
        "@type": "Person",
        name: "KJR020",
      },
    });
  });
});
