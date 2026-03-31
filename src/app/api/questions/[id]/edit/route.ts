import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/session";

// POST /api/questions/[id]/edit — edit a question
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
  const { title, body } = await request.json();

  const [question] = await db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.id, questionId));

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  await db.insert(schema.revisions).values({
    questionId,
    userId: user.id,
    body: question.body,
  });

  await db
    .update(schema.questions)
    .set({
      title: title?.trim() || question.title,
      body: body?.trim() || question.body,
      updatedAt: new Date(),
    })
    .where(eq(schema.questions.id, questionId));

  return NextResponse.json({ ok: true });
}
