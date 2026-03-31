import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/session";
import { addRep, removeRep } from "@/lib/reputation";

// POST /api/questions/[id]/accept — accept an answer
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
  const { answerId } = await request.json();

  const [question] = await db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.id, questionId));

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  if (question.userId !== user.id) {
    return NextResponse.json(
      { error: "Only the question author can accept an answer" },
      { status: 403 }
    );
  }

  const newAcceptedId =
    question.acceptedAnswerId === answerId ? null : answerId;

  // Unaccept previous answer if any
  if (question.acceptedAnswerId) {
    const [prevAnswer] = await db
      .select()
      .from(schema.answers)
      .where(eq(schema.answers.id, question.acceptedAnswerId));
    await db
      .update(schema.answers)
      .set({ isAccepted: false })
      .where(eq(schema.answers.id, question.acceptedAnswerId));
    if (prevAnswer) {
      await removeRep(prevAnswer.userId, "answer_accepted", questionId, prevAnswer.id);
      await removeRep(user.id, "accepted_answer", questionId, prevAnswer.id);
    }
  }

  // Accept new answer
  if (newAcceptedId) {
    const [newAnswer] = await db
      .select()
      .from(schema.answers)
      .where(eq(schema.answers.id, newAcceptedId));
    await db
      .update(schema.answers)
      .set({ isAccepted: true })
      .where(eq(schema.answers.id, newAcceptedId));
    if (newAnswer) {
      await addRep(newAnswer.userId, "answer_accepted", questionId, newAcceptedId);
      await addRep(user.id, "accepted_answer", questionId, newAcceptedId);
    }
  }

  await db
    .update(schema.questions)
    .set({ acceptedAnswerId: newAcceptedId })
    .where(eq(schema.questions.id, questionId));

  return NextResponse.json({ acceptedAnswerId: newAcceptedId });
}
