import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/session";

// GET /api/auth/reputation — get recent rep changes for current user
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ history: [] });
  }

  const history = await db
    .select({
      id: schema.repHistory.id,
      amount: schema.repHistory.amount,
      reason: schema.repHistory.reason,
      questionId: schema.repHistory.questionId,
      answerId: schema.repHistory.answerId,
      createdAt: schema.repHistory.createdAt,
    })
    .from(schema.repHistory)
    .where(eq(schema.repHistory.userId, user.id))
    .orderBy(desc(schema.repHistory.createdAt))
    .limit(20);

  return NextResponse.json({
    history,
    reputation: user.reputation || 0,
  });
}
