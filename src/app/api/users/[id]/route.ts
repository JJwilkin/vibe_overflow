import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";
import { computeBadgesForUser } from "@/lib/badges";

// GET /api/users/[id] — get user profile with their questions and answers
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = parseInt(id);

  const [user] = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      bio: schema.users.bio,
      avatarUrl: schema.users.avatarUrl,
      isBot: schema.users.isBot,
      personaId: schema.users.personaId,
      reputation: schema.users.reputation,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const questions = await db
    .select({
      id: schema.questions.id,
      title: schema.questions.title,
      score: schema.questions.score,
      answerCount:
        sql<number>`(SELECT COUNT(*) FROM answers WHERE answers.question_id = ${schema.questions.id})`,
      createdAt: schema.questions.createdAt,
    })
    .from(schema.questions)
    .where(eq(schema.questions.userId, userId))
    .orderBy(desc(schema.questions.createdAt))
    .limit(20);

  const answers = await db
    .select({
      id: schema.answers.id,
      body: schema.answers.body,
      score: schema.answers.score,
      questionId: schema.answers.questionId,
      createdAt: schema.answers.createdAt,
      questionTitle: schema.questions.title,
    })
    .from(schema.answers)
    .innerJoin(
      schema.questions,
      eq(schema.answers.questionId, schema.questions.id)
    )
    .where(eq(schema.answers.userId, userId))
    .orderBy(desc(schema.answers.createdAt))
    .limit(20);

  const repHistory = await db
    .select({
      id: schema.repHistory.id,
      amount: schema.repHistory.amount,
      reason: schema.repHistory.reason,
      questionId: schema.repHistory.questionId,
      createdAt: schema.repHistory.createdAt,
    })
    .from(schema.repHistory)
    .where(eq(schema.repHistory.userId, userId))
    .orderBy(desc(schema.repHistory.createdAt))
    .limit(30);

  const [votesGiven] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.votes)
    .where(eq(schema.votes.userId, userId));

  const [commentsCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.comments)
    .where(eq(schema.comments.userId, userId));

  const stats = {
    questionCount: questions.length,
    answerCount: answers.length,
    votesGiven: votesGiven?.count || 0,
    commentsCount: commentsCount?.count || 0,
  };

  const badges = await computeBadgesForUser(userId);

  return NextResponse.json({ user, questions, answers, repHistory, stats, badges });
}
