import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/session";

// POST /api/answers/[id]/edit — edit an answer
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
  const { body } = await request.json();

  if (!body?.trim()) {
    return NextResponse.json(
      { error: "Answer body is required" },
      { status: 400 }
    );
  }

  const [answer] = await db
    .select()
    .from(schema.answers)
    .where(eq(schema.answers.id, answerId));

  if (!answer) {
    return NextResponse.json({ error: "Answer not found" }, { status: 404 });
  }

  await db.insert(schema.revisions).values({
    answerId,
    userId: user.id,
    body: answer.body,
  });

  await db
    .update(schema.answers)
    .set({ body: body.trim() })
    .where(eq(schema.answers.id, answerId));

  return NextResponse.json({ ok: true });
}
