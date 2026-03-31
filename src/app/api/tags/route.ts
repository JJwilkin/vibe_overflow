import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql, desc } from "drizzle-orm";

// GET /api/tags — list all tags with question counts
export async function GET() {
  const tags = await db
    .select({
      id: schema.tags.id,
      name: schema.tags.name,
      description: schema.tags.description,
      questionCount:
        sql<number>`(SELECT COUNT(*) FROM question_tags WHERE question_tags.tag_id = ${schema.tags.id})`.as("question_count"),
    })
    .from(schema.tags)
    .orderBy(desc(sql`question_count`));

  return NextResponse.json({ tags });
}
