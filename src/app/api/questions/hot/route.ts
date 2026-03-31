import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";

// GET /api/questions/hot — top questions ranked by activity hotness
export async function GET() {
  const hotQuestions = await db
    .select({
      id: schema.questions.id,
      title: schema.questions.title,
      score: schema.questions.score,
      viewCount: schema.questions.viewCount,
      answerCount:
        sql<number>`(SELECT COUNT(*) FROM answers WHERE answers.question_id = ${schema.questions.id})`.as(
          "answer_count"
        ),
      createdAt: schema.questions.createdAt,
    })
    .from(schema.questions)
    .orderBy(
      sql`(
        (SELECT COUNT(*) FROM answers WHERE answers.question_id = ${schema.questions.id}) * 4
        + ${schema.questions.score} * 2
        + ${schema.questions.viewCount}
      ) * 1.0 / GREATEST(1, EXTRACT(EPOCH FROM (NOW() - ${schema.questions.createdAt})) / 3600) DESC`
    )
    .limit(10);

  return NextResponse.json(hotQuestions);
}
