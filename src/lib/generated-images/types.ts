export type ThumbnailPurpose = "card" | "ogp";
export type ThumbnailPreset = "card-sm" | "card-lg" | "ogp";

export type ThumbnailInput = {
  articleId: string;
  category?: string;
  publishedAt?: Date | string;
  tags?: string[];
  title: string;
};

export type NormalizedThumbnailInput = {
  articleId: string;
  category?: string;
  publishedAt?: string;
  tags: string[];
  title: string;
};

export type GeneratedImageReference = {
  format: "png" | "webp";
  height: number;
  key: string;
  url: string;
  width: number;
};

export type ThumbnailSpec = {
  cardLarge: GeneratedImageReference;
  cardSmall: GeneratedImageReference;
  input: NormalizedThumbnailInput;
  ogp: GeneratedImageReference;
};
