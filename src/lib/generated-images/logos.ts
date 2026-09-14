import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type LogoDefinition = {
  aliases: string[];
  assetPath: string;
  color: string;
  id: string;
};

const assetDirectory = join(process.cwd(), "src", "assets", "thumbnails", "logos");

// SVG files are copied from Simple Icons (CC0-1.0) and kept locally so builds
// never fetch brand artwork from the network.
export const LOGO_REGISTRY: readonly LogoDefinition[] = [
  {
    id: "astro",
    aliases: ["astro"],
    assetPath: join(assetDirectory, "astro.svg"),
    color: "#BC52EE",
  },
  {
    id: "react",
    aliases: ["react"],
    assetPath: join(assetDirectory, "react.svg"),
    color: "#61DAFB",
  },
  {
    id: "typescript",
    aliases: ["ts", "typescript"],
    assetPath: join(assetDirectory, "typescript.svg"),
    color: "#3178C6",
  },
  {
    id: "python",
    aliases: ["python"],
    assetPath: join(assetDirectory, "python.svg"),
    color: "#3776AB",
  },
] as const;

const aliases = new Map(
  LOGO_REGISTRY.flatMap((logo) =>
    logo.aliases.map((alias) => [alias.normalize("NFKC").toLowerCase(), logo.id]),
  ),
);

export function resolveLogoIds(tags: readonly string[]): string[] {
  const ids: string[] = [];
  for (const tag of tags) {
    const id = aliases.get(tag.normalize("NFKC").trim().toLowerCase());
    if (id && !ids.includes(id)) ids.push(id);
    if (ids.length === 3) break;
  }
  return ids;
}

export function getLogo(id: string): LogoDefinition {
  const logo = LOGO_REGISTRY.find((entry) => entry.id === id);
  if (!logo) throw new Error(`Unknown thumbnail logo: ${id}`);
  return logo;
}

export function getLogoSvg(id: string): Buffer {
  return readFileSync(getLogo(id).assetPath);
}

export function getLogoDigest(id: string): string {
  return createHash("sha256").update(getLogoDataUrl(id)).digest("hex");
}

export function getLogoDataUrl(id: string): string {
  const logo = getLogo(id);
  const svg = getLogoSvg(id).toString("utf8").replace("<svg ", `<svg fill="${logo.color}" `);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
