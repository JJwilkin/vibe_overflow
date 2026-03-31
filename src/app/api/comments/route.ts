import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAuthUser } from "@/lib/auth/session";

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

  return NextResponse.json({ comment }, { status: 201 });
}
