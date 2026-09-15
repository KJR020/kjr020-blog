import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/posts" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().optional().default(false),
    tags: z.array(z.string()).optional().default([]),
    description: z.string().optional(),
    category: z.string().optional(),
    heroImage: z.union([z.string(), z.object({ src: z.string(), alt: z.string() })]).optional(),
    featured: z.boolean().optional().default(false),
  }),
});

export const collections = { posts };
