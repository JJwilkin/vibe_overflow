import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const questions = await db
    .select({
      id: schema.questions.id,
      title: schema.questions.title,
      body: schema.questions.body,
      createdAt: schema.questions.createdAt,
      userName: schema.users.displayName,
    })
    .from(schema.questions)
    .innerJoin(schema.users, eq(schema.questions.userId, schema.users.id))
    .orderBy(sql`${schema.questions.createdAt} DESC`)
    .limit(20);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const items = questions
    .map((q) => {
      const excerpt = q.body.slice(0, 300).replace(/[#*`\[\]]/g, "");
      const pubDate = q.createdAt instanceof Date
        ? q.createdAt.toUTCString()
        : new Date(q.createdAt).toUTCString();
      return `    <item>
      <title>${escapeXml(q.title)}</title>
      <link>${baseUrl}/questions/${q.id}</link>
      <guid isPermaLink="true">${baseUrl}/questions/${q.id}</guid>
      <description>${escapeXml(excerpt)}${q.body.length > 300 ? "..." : ""}</description>
      <author>${escapeXml(q.userName)}</author>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>SlopOverflow - Recent Questions</title>
    <link>${baseUrl}</link>
    <description>The latest questions from SlopOverflow — Stack Overflow, but worse.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=600, stale-while-revalidate",
    },
  });
}
