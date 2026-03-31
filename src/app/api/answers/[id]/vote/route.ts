import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/session";
import { addRep, removeRep } from "@/lib/reputation";

// POST /api/answers/[id]/vote — vote on an answer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { id } = await params;
  const answerId = parseInt(id);
  const { value } = await request.json();

  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "Vote must be 1 or -1" }, { status: 400 });
  }

  const [answer] = await db
    .select()
    .from(schema.answers)
    .where(eq(schema.answers.id, answerId));
  if (!answer) {
    return NextResponse.json({ error: "Answer not found" }, { status: 404 });
  }

  const [existingVote] = await db
    .select()
    .from(schema.votes)
    .where(
      and(
        eq(schema.votes.userId, user.id),
        eq(schema.votes.answerId, answerId)
      )
    );

  if (existingVote) {
    if (existingVote.value === value) {
      await db.delete(schema.votes).where(eq(schema.votes.id, existingVote.id));
      await db
        .update(schema.answers)
        .set({ score: sql`${schema.answers.score} - ${value}` })
        .where(eq(schema.answers.id, answerId));
      await removeRep(
        answer.userId,
        value === 1 ? "answer_upvoted" : "answer_downvoted",
        answer.questionId,
        answerId
      );
      return NextResponse.json({ voted: null });
    } else {
      await db
        .update(schema.votes)
        .set({ value })
        .where(eq(schema.votes.id, existingVote.id));
      await db
        .update(schema.answers)
        .set({ score: sql`${schema.answers.score} + ${value * 2}` })
        .where(eq(schema.answers.id, answerId));
      await removeRep(
        answer.userId,
        existingVote.value === 1 ? "answer_upvoted" : "answer_downvoted",
        answer.questionId,
        answerId
      );
      await addRep(
        answer.userId,
        value === 1 ? "answer_upvoted" : "answer_downvoted",
        answer.questionId,
        answerId
      );
      return NextResponse.json({ voted: value });
    }
  }

  await db.insert(schema.votes).values({ userId: user.id, answerId, value });
  await db
    .update(schema.answers)
    .set({ score: sql`${schema.answers.score} + ${value}` })
    .where(eq(schema.answers.id, answerId));
  await addRep(
    answer.userId,
    value === 1 ? "answer_upvoted" : "answer_downvoted",
    answer.questionId,
    answerId
  );

  return NextResponse.json({ voted: value });
}
