import type { MetadataRoute } from "next";
import { db, schema } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");

  const questions = await db
    .select({ id: schema.questions.id, updatedAt: schema.questions.updatedAt })
    .from(schema.questions);

  const users = await db
    .select({ id: schema.users.id })
    .from(schema.users);

  const tags = await db
    .select({ name: schema.tags.name })
    .from(schema.tags);

  return [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/questions`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/users`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/tags`, changeFrequency: "weekly", priority: 0.5 },
    ...questions.map((q) => ({
      url: `${baseUrl}/questions/${q.id}`,
      lastModified: q.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...users.map((u) => ({
      url: `${baseUrl}/users/${u.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
    ...tags.map((t) => ({
      url: `${baseUrl}/questions?q=${encodeURIComponent(`[${t.name}]`)}`,
      changeFrequency: "weekly" as const,
      priority: 0.3,
    })),
  ];
}
