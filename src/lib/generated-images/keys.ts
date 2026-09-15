import { createHash } from "node:crypto";

import type { ThumbnailPreset, ThumbnailPurpose } from "./types";

export type GenerationKeyInput = {
  articleId?: string;
  category?: string;
  dependencies?: Record<string, string>;
  dimensions?: { height: number; width: number };
  environment?: string;
  format?: "png" | "webp";
  logoAssets?: { digest: string; id: string }[];
  preset?: ThumbnailPreset;
  publishedAt?: string;
  purpose: ThumbnailPurpose;
  quality?: number;
  tags?: string[];
  templateVersion: string;
  title: string;
  renderer?: { satori: string; sharp: string };
};

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortObject(entry)]),
  );
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortObject(value));
}

export function buildGenerationKey(input: GenerationKeyInput): string {
  return createHash("sha256").update(canonicalJson(input)).digest("hex");
}
