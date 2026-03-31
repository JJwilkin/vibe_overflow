import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/session";
import { createNotification } from "@/lib/notifications";

// POST /api/questions/[id]/answers — post an answer
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
  const { body } = await request.json();

  if (!body?.trim()) {
    return NextResponse.json(
      { error: "Answer body is required" },
      { status: 400 }
    );
  }

  const [answer] = await db
    .insert(schema.answers)
    .values({
      body: body.trim(),
      questionId,
      userId: user.id,
    })
    .returning();

  // Notify question author
  const [question] = await db
    .select({ userId: schema.questions.userId, title: schema.questions.title })
    .from(schema.questions)
    .where(eq(schema.questions.id, questionId));

  if (question && question.userId !== user.id) {
    createNotification(
      question.userId,
      "answer",
      `${user.displayName} answered your question "${question.title.slice(0, 60)}"`,
      `/questions/${questionId}#answer-${answer.id}`
    ).catch(() => {});
  }

  return NextResponse.json({ answer }, { status: 201 });
}
