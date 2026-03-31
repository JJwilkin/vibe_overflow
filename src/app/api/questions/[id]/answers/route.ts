import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getAuthUser } from "@/lib/auth/session";

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

  return NextResponse.json({ answer }, { status: 201 });
}
