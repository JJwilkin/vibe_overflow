import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/session";
import { addRep, removeRep } from "@/lib/reputation";

// POST /api/questions/[id]/vote — vote on a question
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { id } = await params;
  const questionId = parseInt(id);
  const { value } = await request.json();

  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "Vote must be 1 or -1" }, { status: 400 });
  }

  const [question] = await db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.id, questionId));
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const [existingVote] = await db
    .select()
    .from(schema.votes)
    .where(
      and(
        eq(schema.votes.userId, user.id),
        eq(schema.votes.questionId, questionId)
      )
    );

  if (existingVote) {
    if (existingVote.value === value) {
      await db.delete(schema.votes).where(eq(schema.votes.id, existingVote.id));
      await db
        .update(schema.questions)
        .set({ score: sql`${schema.questions.score} - ${value}` })
        .where(eq(schema.questions.id, questionId));
      await removeRep(
        question.userId,
        value === 1 ? "question_upvoted" : "question_downvoted",
        questionId
      );
      return NextResponse.json({ voted: null });
    } else {
      await db
        .update(schema.votes)
        .set({ value })
        .where(eq(schema.votes.id, existingVote.id));
      await db
        .update(schema.questions)
        .set({ score: sql`${schema.questions.score} + ${value * 2}` })
        .where(eq(schema.questions.id, questionId));
      await removeRep(
        question.userId,
        existingVote.value === 1 ? "question_upvoted" : "question_downvoted",
        questionId
      );
      await addRep(
        question.userId,
        value === 1 ? "question_upvoted" : "question_downvoted",
        questionId
      );
      return NextResponse.json({ voted: value });
    }
  }

  await db.insert(schema.votes).values({ userId: user.id, questionId, value });
  await db
    .update(schema.questions)
    .set({ score: sql`${schema.questions.score} + ${value}` })
    .where(eq(schema.questions.id, questionId));
  await addRep(
    question.userId,
    value === 1 ? "question_upvoted" : "question_downvoted",
    questionId
  );

  return NextResponse.json({ voted: value });
}
