import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";

// GET /api/questions/[id] — get single question with answers
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const questionId = parseInt(id);

  const [question] = await db
    .select({
      id: schema.questions.id,
      title: schema.questions.title,
      body: schema.questions.body,
      userId: schema.questions.userId,
      viewCount: schema.questions.viewCount,
      score: schema.questions.score,
      acceptedAnswerId: schema.questions.acceptedAnswerId,
      createdAt: schema.questions.createdAt,
      updatedAt: schema.questions.updatedAt,
      userName: schema.users.displayName,
      userReputation: schema.users.reputation,
      userAvatar: schema.users.avatarUrl,
      isBot: schema.users.isBot,
      editCount: sql<number>`(SELECT COUNT(*) FROM revisions WHERE revisions.question_id = ${schema.questions.id})`,
    })
    .from(schema.questions)
    .innerJoin(schema.users, eq(schema.questions.userId, schema.users.id))
    .where(eq(schema.questions.id, questionId));

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Increment view count
  await db
    .update(schema.questions)
    .set({ viewCount: sql`${schema.questions.viewCount} + 1` })
    .where(eq(schema.questions.id, questionId));

  // Get answers with edit count
  const answers = await db
    .select({
      id: schema.answers.id,
      body: schema.answers.body,
      userId: schema.answers.userId,
      score: schema.answers.score,
      isAccepted: schema.answers.isAccepted,
      createdAt: schema.answers.createdAt,
      userName: schema.users.displayName,
      userReputation: schema.users.reputation,
      userAvatar: schema.users.avatarUrl,
      isBot: schema.users.isBot,
      personaId: schema.users.personaId,
      editCount: sql<number>`(SELECT COUNT(*) FROM revisions WHERE revisions.answer_id = ${schema.answers.id})`,
    })
    .from(schema.answers)
    .innerJoin(schema.users, eq(schema.answers.userId, schema.users.id))
    .where(eq(schema.answers.questionId, questionId))
    .orderBy(sql`${schema.answers.score} DESC, ${schema.answers.createdAt} ASC`);

  // Get tags
  const tagRows = await db
    .select({ name: schema.tags.name })
    .from(schema.questionTags)
    .innerJoin(schema.tags, eq(schema.questionTags.tagId, schema.tags.id))
    .where(eq(schema.questionTags.questionId, questionId));

  const tags = tagRows.map((t) => t.name);

  // Get comments on the question
  const questionComments = await db
    .select({
      id: schema.comments.id,
      body: schema.comments.body,
      userId: schema.comments.userId,
      questionId: schema.comments.questionId,
      answerId: schema.comments.answerId,
      score: schema.comments.score,
      createdAt: schema.comments.createdAt,
      userName: schema.users.displayName,
      isBot: schema.users.isBot,
    })
    .from(schema.comments)
    .innerJoin(schema.users, eq(schema.comments.userId, schema.users.id))
    .where(and(eq(schema.comments.questionId, questionId), sql`${schema.comments.answerId} IS NULL`))
    .orderBy(schema.comments.createdAt);

  // Also get comments on answers for this question
  const answerIds = answers.map((a) => a.id);
  let answerComments: typeof questionComments = [];
  if (answerIds.length > 0) {
    answerComments = await db
      .select({
        id: schema.comments.id,
        body: schema.comments.body,
        userId: schema.comments.userId,
        questionId: schema.comments.questionId,
        answerId: schema.comments.answerId,
        score: schema.comments.score,
        createdAt: schema.comments.createdAt,
        userName: schema.users.displayName,
        isBot: schema.users.isBot,
      })
      .from(schema.comments)
      .innerJoin(schema.users, eq(schema.comments.userId, schema.users.id))
      .where(sql`${schema.comments.answerId} IN (${sql.raw(answerIds.join(","))})`)
      .orderBy(schema.comments.createdAt);
  }

  const allComments = [...questionComments, ...answerComments];

  // Get close votes
  const closeVoteList = await db
    .select({
      id: schema.closeVotes.id,
      reason: schema.closeVotes.reason,
      userName: schema.users.displayName,
    })
    .from(schema.closeVotes)
    .innerJoin(schema.users, eq(schema.closeVotes.userId, schema.users.id))
    .where(eq(schema.closeVotes.questionId, questionId));

  return NextResponse.json({
    question,
    answers,
    tags,
    comments: allComments,
    closeVotes: closeVoteList,
  });
}
