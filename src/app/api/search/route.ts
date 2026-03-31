import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, like, or, sql, desc, inArray } from "drizzle-orm";

// GET /api/search?q=query
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ questions: [] });
  }

  // Check if searching by tag: [tagname]
  const tagMatch = query.match(/^\[(.+)\]$/);

  if (tagMatch) {
    const tagName = tagMatch[1];
    const [tag] = await db
      .select()
      .from(schema.tags)
      .where(eq(schema.tags.name, tagName));

    if (!tag) {
      return NextResponse.json({ questions: [] });
    }

    const questionIdRows = await db
      .select({ questionId: schema.questionTags.questionId })
      .from(schema.questionTags)
      .where(eq(schema.questionTags.tagId, tag.id));

    const questionIds = questionIdRows.map((r) => r.questionId);

    if (questionIds.length === 0) {
      return NextResponse.json({ questions: [] });
    }

    const questions = await db
      .select({
        id: schema.questions.id,
        title: schema.questions.title,
        body: schema.questions.body,
        userId: schema.questions.userId,
        viewCount: schema.questions.viewCount,
        score: schema.questions.score,
        createdAt: schema.questions.createdAt,
        userName: schema.users.displayName,
        userReputation: schema.users.reputation,
        isBot: schema.users.isBot,
        answerCount:
          sql<number>`(SELECT COUNT(*) FROM answers WHERE answers.question_id = ${schema.questions.id})`,
      })
      .from(schema.questions)
      .innerJoin(schema.users, eq(schema.questions.userId, schema.users.id))
      .where(inArray(schema.questions.id, questionIds))
      .orderBy(desc(schema.questions.score))
      .limit(50);

    return NextResponse.json({ questions });
  }

  // Regular text search using ILIKE for PostgreSQL
  const pattern = `%${query}%`;
  const questions = await db
    .select({
      id: schema.questions.id,
      title: schema.questions.title,
      body: schema.questions.body,
      userId: schema.questions.userId,
      viewCount: schema.questions.viewCount,
      score: schema.questions.score,
      createdAt: schema.questions.createdAt,
      userName: schema.users.displayName,
      userReputation: schema.users.reputation,
      isBot: schema.users.isBot,
      answerCount:
        sql<number>`(SELECT COUNT(*) FROM answers WHERE answers.question_id = ${schema.questions.id})`,
    })
    .from(schema.questions)
    .innerJoin(schema.users, eq(schema.questions.userId, schema.users.id))
    .where(
      or(
        sql`${schema.questions.title} ILIKE ${pattern}`,
        sql`${schema.questions.body} ILIKE ${pattern}`
      )
    )
    .orderBy(desc(schema.questions.score))
    .limit(50);

  return NextResponse.json({ questions });
}
