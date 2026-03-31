import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/session";
import { enqueueCommentReplies, enqueueMentionReply } from "@/lib/ai/queue";
import { createNotification } from "@/lib/notifications";

// POST /api/comments — add a comment to a question or answer
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { body, questionId, answerId } = await request.json();

  if (!body?.trim()) {
    return NextResponse.json(
      { error: "Comment body is required" },
      { status: 400 }
    );
  }

  if (body.trim().length > 600) {
    return NextResponse.json(
      { error: "Comments must be under 600 characters" },
      { status: 400 }
    );
  }

  if (!questionId && !answerId) {
    return NextResponse.json(
      { error: "Must specify questionId or answerId" },
      { status: 400 }
    );
  }

  const [comment] = await db
    .insert(schema.comments)
    .values({
      body: body.trim(),
      userId: user.id,
      questionId: questionId || null,
      answerId: answerId || null,
    })
    .returning();

  // Fire-and-forget: notifications, mentions, bot replies
  // Don't block the response on these DB lookups
  (async () => {
    const notifiedUserIds = new Set<number>();

    if (answerId) {
      const [answer] = await db
        .select({
          userId: schema.answers.userId,
          questionId: schema.answers.questionId,
        })
        .from(schema.answers)
        .where(eq(schema.answers.id, answerId));

      if (answer && answer.userId !== user.id) {
        notifiedUserIds.add(answer.userId);
        createNotification(
          answer.userId,
          "comment",
          `${user.displayName} commented on your answer`,
          `/questions/${answer.questionId}#answer-${answerId}`
        ).catch(() => {});
      }
    } else if (questionId) {
      const [question] = await db
        .select({ userId: schema.questions.userId, title: schema.questions.title })
        .from(schema.questions)
        .where(eq(schema.questions.id, questionId));

      if (question && question.userId !== user.id) {
        notifiedUserIds.add(question.userId);
        createNotification(
          question.userId,
          "comment",
          `${user.displayName} commented on your question "${question.title.slice(0, 60)}"`,
          `/questions/${questionId}`
        ).catch(() => {});
      }
    }

    // Parse @mentions and enqueue bot replies / notify mentioned users
    const mentions = body.match(/@(\w+)/g);
    if (mentions) {
      const usernames = mentions.map((m: string) => m.slice(1));
      for (const username of usernames) {
        const [mentionedUser] = await db
          .select({
            id: schema.users.id,
            isBot: schema.users.isBot,
            personaId: schema.users.personaId,
          })
          .from(schema.users)
          .where(eq(schema.users.username, username));

        if (!mentionedUser) continue;

        if (mentionedUser.isBot && mentionedUser.personaId) {
          enqueueMentionReply(
            questionId || 0,
            answerId || null,
            mentionedUser.personaId
          ).catch(() => {});
        }

        if (mentionedUser.id !== user.id && !notifiedUserIds.has(mentionedUser.id)) {
          notifiedUserIds.add(mentionedUser.id);
          const link = answerId
            ? `/questions/${questionId}#answer-${answerId}`
            : `/questions/${questionId}`;
          createNotification(
            mentionedUser.id,
            "mention",
            `${user.displayName} mentioned you in a comment`,
            link
          ).catch(() => {});
        }
      }
    }

    enqueueCommentReplies(questionId || 0, answerId || null).catch(() => {});
  })().catch(() => {});

  return NextResponse.json({ comment }, { status: 201 });
}
