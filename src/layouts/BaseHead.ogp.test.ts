import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";

const distDir = join(process.cwd(), "dist");
const astroBin = join(process.cwd(), "node_modules", ".bin", "astro");
const baseHeadPath = join(process.cwd(), "src", "layouts", "BaseHead.astro");

function buildSite() {
  execFileSync(astroBin, ["build"], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

function readHtmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      return readHtmlFiles(fullPath);
    }

    return entry.isFile() && entry.name === "index.html" ? [readFileSync(fullPath, "utf8")] : [];
  });
}

function readStructuredData(html: string) {
  const matches = [
    ...html.matchAll(
      /<script\b(?=[^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];

  return matches.map((match) => JSON.parse(match[1]));
}

describe("BaseHead OGP meta tags", () => {
  let rssXml = "";

  beforeAll(() => {
    buildSite();

    const rssPath = join(distDir, "rss.xml");
    rssXml = existsSync(rssPath) ? readFileSync(rssPath, "utf8") : "";
  }, 60_000);

  it("renders article OGP meta tags on post pages", () => {
    const postHtml = readHtmlFiles(join(distDir, "posts")).find(
      (html) =>
        html.includes("<title>Cookieとは - KJR020&#39;s Blog</title>") &&
        html.includes('<meta property="article:tag" content="Cookie">'),
    );

    expect(postHtml).toBeDefined();
    expect(postHtml).toContain('<meta property="og:type" content="article">');
    expect(postHtml).toContain('<meta property="og:locale" content="ja_JP">');
    expect(postHtml).toContain('<meta property="article:published_time"');
    expect(postHtml).toContain('<meta property="article:tag" content="Cookie">');
    expect(postHtml).toContain('<meta property="article:tag" content="Web">');
    expect(postHtml).toContain('<meta property="article:tag" content="HTTP">');
    expect(postHtml).toMatch(
      /<meta property="og:image" content="https:\/\/kjr020\.dev\/generated-images\/ogp\/[a-f0-9]{64}\.png">/,
    );
    expect(postHtml).toMatch(
      /<meta name="twitter:image" content="https:\/\/kjr020\.dev\/generated-images\/ogp\/[a-f0-9]{64}\.png">/,
    );
    expect(postHtml).not.toContain('<meta property="article:modified_time"');
  });

  it("renders WebSite, Person, and BlogPosting JSON-LD on post pages", () => {
    const postHtml = readHtmlFiles(join(distDir, "posts")).find(
      (html) =>
        html.includes("<title>Cookieとは - KJR020&#39;s Blog</title>") &&
        html.includes('<meta property="article:tag" content="Cookie">'),
    );

    expect(postHtml).toBeDefined();

    const structuredData = readStructuredData(postHtml ?? "");
    const graph = structuredData[0]["@graph"];

    expect(structuredData).toHaveLength(1);
    expect(graph.map((entry: { "@type": string }) => entry["@type"])).toEqual([
      "WebSite",
      "Person",
      "BlogPosting",
    ]);
    expect(graph[2]).toMatchObject({
      "@type": "BlogPosting",
      "@id": "https://kjr020.dev/posts/general/cookie%E3%81%A8%E3%81%AF/#blogposting",
      headline: "Cookieとは",
      description: "KJR020の技術ブログ",
      datePublished: "2024-08-25T08:03:17.000Z",
      dateModified: "2024-08-25T08:03:17.000Z",
      author: { "@id": "https://kjr020.dev/#person" },
      keywords: ["Cookie", "Web", "HTTP"],
    });
  });

  it("renders JSON-LD script with an explicit closing tag", () => {
    const baseHeadSource = readFileSync(baseHeadPath, "utf8");

    expect(baseHeadSource).toContain('<script type="application/ld+json"');
    expect(baseHeadSource).not.toMatch(/<script[^>]*type="application\/ld\+json"[^>]*\/>/);
    expect(baseHeadSource).toMatch(/<script[^>]*type="application\/ld\+json"[^>]*><\/script>/);
  });

  it("reads JSON-LD script even when script attributes change order or spacing", () => {
    const [structuredData] = readStructuredData(
      '<script data-kind="structured-data" type = \'application/ld+json\' nonce="abc">{"@context":"https://schema.org"}</script>',
    );

    expect(structuredData).toEqual({
      "@context": "https://schema.org",
    });
  });

  it("keeps website OGP type on non-post pages", () => {
    const indexHtml = readFileSync(join(distDir, "index.html"), "utf8");
    const indexDoc = new DOMParser().parseFromString(indexHtml, "text/html");
    const rssHeadLink = indexDoc.querySelector('link[rel="alternate"][type="application/rss+xml"]');
    const rssFooterLink = indexDoc.querySelector('a[aria-label="RSS"]');

    expect(indexHtml).toContain('<meta property="og:type" content="website">');
    expect(indexHtml).toContain('<meta property="og:locale" content="ja_JP">');
    expect(indexHtml).toContain(
      '<meta property="og:image" content="https://kjr020.dev/og-image.png">',
    );
    expect(indexHtml).toContain('<meta property="og:image:width" content="1200">');
    expect(indexHtml).toContain('<meta property="og:image:height" content="630">');
    expect(indexHtml).toContain('<meta property="og:image:type" content="image/png">');
    expect(indexHtml).toContain(
      '<meta name="twitter:image" content="https://kjr020.dev/og-image.png">',
    );
    expect(rssHeadLink?.getAttribute("title")).toBe("KJR020 Blog RSS Feed");
    expect(rssHeadLink?.getAttribute("href")).toBe("https://kjr020.dev/rss.xml");
    expect(rssFooterLink?.getAttribute("href")).toBe("/rss.xml");
    expect(indexHtml).not.toContain('<meta property="article:published_time"');
    expect(indexHtml).not.toContain('<meta property="article:tag"');

    const structuredData = readStructuredData(indexHtml);
    const graph = structuredData[0]["@graph"];

    expect(graph.map((entry: { "@type": string }) => entry["@type"])).toEqual([
      "WebSite",
      "Person",
    ]);
    expect(graph.some((entry: { "@type": string }) => entry["@type"] === "BlogPosting")).toBe(
      false,
    );
  });

  it("does not generate draft post pages", () => {
    const postHtmlFiles = readHtmlFiles(join(distDir, "posts"));

    expect(
      postHtmlFiles.some((html) =>
        html.includes("<title>fetchPolicyについて - KJR020&#39;s Blog</title>"),
      ),
    ).toBe(false);
  });

  it("ships the default OGP image at the recommended dimensions", async () => {
    const ogImagePath = join(distDir, "og-image.png");

    expect(existsSync(ogImagePath)).toBe(true);

    const metadata = await sharp(ogImagePath).metadata();

    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);
  });

  it("builds article-specific OGP images at the recommended dimensions", async () => {
    const ogImagePath = join(distDir, "og", "posts", "general", "cookieとは.png");

    expect(existsSync(ogImagePath)).toBe(true);

    const metadata = await sharp(ogImagePath).metadata();

    expect(metadata).toMatchObject({ format: "png", width: 1200, height: 630 });
  });

  it("generates an RSS feed for subscribers", () => {
    const rssDoc = new DOMParser().parseFromString(rssXml, "application/xml");
    const atomNamespace = "http://www.w3.org/2005/Atom";

    expect(rssXml).toContain("<rss");
    expect(rssXml).toContain("<channel>");
    expect(rssDoc.querySelector("channel > title")?.textContent).toBe("KJR020's Blog");
    expect(rssDoc.querySelector("channel > link")?.textContent).toBe("https://kjr020.dev");
    expect(rssDoc.querySelector("channel > lastBuildDate")?.textContent).toBe(
      rssDoc.querySelector("channel > item > pubDate")?.textContent,
    );
    expect(rssDoc.getElementsByTagNameNS(atomNamespace, "link")[0]?.getAttribute("href")).toBe(
      "https://kjr020.dev/rss.xml",
    );
  });

  it("includes public posts and excludes draft posts from the RSS feed", () => {
    const rssDoc = new DOMParser().parseFromString(rssXml, "application/xml");
    const itemTitles = Array.from(rssDoc.querySelectorAll("item > title")).map((title) =>
      title.textContent?.trim(),
    );

    expect(itemTitles).toContain(
      "OpenAIが実践するAgent-First時代の開発アプローチ — Harness Engineering",
    );
    expect(itemTitles).toContain("Cookieとは");
    expect(itemTitles).not.toContain("Python標準ライブラリgraphlibでDAG並列実行エンジンを作った");
    expect(itemTitles).not.toContain("FetchPolicyについて");
  });

  it("orders RSS feed items by publish date descending", () => {
    const rssDoc = new DOMParser().parseFromString(rssXml, "application/xml");
    const pubDates = Array.from(rssDoc.querySelectorAll("item > pubDate")).map((pubDate) =>
      Date.parse(pubDate.textContent ?? ""),
    );

    expect(pubDates.length).toBeGreaterThan(1);
    expect(pubDates.every(Number.isFinite)).toBe(true);
    expect(pubDates).toEqual([...pubDates].sort((a, b) => b - a));
  });

  it("uses canonical post links without trailing slashes in RSS items", () => {
    const rssDoc = new DOMParser().parseFromString(rssXml, "application/xml");
    const itemLinks = Array.from(rssDoc.querySelectorAll("item > link")).map((link) =>
      link.textContent?.trim(),
    );

    expect(itemLinks.length).toBeGreaterThan(1);
    expect(itemLinks.every((link) => link?.startsWith("https://kjr020.dev/posts/"))).toBe(true);
    expect(itemLinks.every((link) => !link?.endsWith("/"))).toBe(true);
  });
});
