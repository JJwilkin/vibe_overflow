import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, sql, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/session";
import { enqueueAIResponses } from "@/lib/ai/queue";

// GET /api/questions — list questions
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const sort = searchParams.get("sort") || "newest";
  const filter = searchParams.get("filter") || "";
  const limit = 20;
  const offset = (page - 1) * limit;

  let orderBy;
  switch (sort) {
    case "active":
      orderBy = desc(schema.questions.updatedAt);
      break;
    case "score":
      orderBy = desc(schema.questions.score);
      break;
    default:
      orderBy = desc(schema.questions.createdAt);
  }

  const baseQuery = db
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
      answerCount: sql<number>`(SELECT COUNT(*) FROM answers WHERE answers.question_id = ${schema.questions.id})`,
    })
    .from(schema.questions)
    .innerJoin(schema.users, eq(schema.questions.userId, schema.users.id));

  const questions =
    filter === "unanswered"
      ? await baseQuery
          .where(
            sql`(SELECT COUNT(*) FROM answers WHERE answers.question_id = ${schema.questions.id}) = 0`
          )
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset)
      : await baseQuery.orderBy(orderBy).limit(limit).offset(offset);

  const [totalResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.questions);

  return NextResponse.json({
    questions,
    total: totalResult?.count || 0,
    page,
    totalPages: Math.ceil((totalResult?.count || 0) / limit),
  });
}

// POST /api/questions — create a question
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { title, body, tags } = await request.json();

  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json(
      { error: "Title and body are required" },
      { status: 400 }
    );
  }

  const [question] = await db
    .insert(schema.questions)
    .values({
      title: title.trim(),
      body: body.trim(),
      userId: user.id,
    })
    .returning();

  // Attach tags
  if (tags && Array.isArray(tags)) {
    for (const tagName of tags) {
      const [tag] = await db
        .select()
        .from(schema.tags)
        .where(eq(schema.tags.name, tagName));

      if (tag) {
        try {
          await db.insert(schema.questionTags).values({
            questionId: question.id,
            tagId: tag.id,
          });
        } catch {
          // Ignore duplicate tag assignments
        }
      }
    }
  }

  // Enqueue AI responses
  await enqueueAIResponses(question.id);

  return NextResponse.json({ question }, { status: 201 });
}
