import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/session";

// POST /api/comments/[id]/vote — vote on a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { id } = await params;
  const commentId = parseInt(id);
  const { value } = await request.json();

  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "Vote must be 1 or -1" }, { status: 400 });
  }

  const [comment] = await db
    .select()
    .from(schema.comments)
    .where(eq(schema.comments.id, commentId));
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const [existingVote] = await db
    .select()
    .from(schema.commentVotes)
    .where(
      and(
        eq(schema.commentVotes.userId, user.id),
        eq(schema.commentVotes.commentId, commentId)
      )
    );

  if (existingVote) {
    if (existingVote.value === value) {
      // Remove vote (toggle off)
      await db.delete(schema.commentVotes).where(eq(schema.commentVotes.id, existingVote.id));
      await db
        .update(schema.comments)
        .set({ score: sql`${schema.comments.score} - ${value}` })
        .where(eq(schema.comments.id, commentId));
      return NextResponse.json({ voted: null, score: comment.score - value });
    } else {
      // Switch vote
      await db
        .update(schema.commentVotes)
        .set({ value })
        .where(eq(schema.commentVotes.id, existingVote.id));
      await db
        .update(schema.comments)
        .set({ score: sql`${schema.comments.score} + ${value * 2}` })
        .where(eq(schema.comments.id, commentId));
      return NextResponse.json({ voted: value, score: comment.score + value * 2 });
    }
  }

  // New vote
  await db.insert(schema.commentVotes).values({ userId: user.id, commentId, value });
  await db
    .update(schema.comments)
    .set({ score: sql`${schema.comments.score} + ${value}` })
    .where(eq(schema.comments.id, commentId));

  return NextResponse.json({ voted: value, score: comment.score + value });
}
