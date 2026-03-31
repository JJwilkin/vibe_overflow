import { db, schema } from "./db";
import { eq, sql } from "drizzle-orm";

const REP_VALUES = {
  answer_upvoted: 10,
  answer_downvoted: -2,
  question_upvoted: 5,
  question_downvoted: -2,
  answer_accepted: 15,
  accepted_answer: 2, // rep for the person who accepted
} as const;

type RepReason = keyof typeof REP_VALUES;

export async function addRep(
  userId: number,
  reason: RepReason,
  questionId?: number,
  answerId?: number
) {
  const amount = REP_VALUES[reason];

  await db
    .update(schema.users)
    .set({ reputation: sql`GREATEST(1, ${schema.users.reputation} + ${amount})` })
    .where(eq(schema.users.id, userId));

  await db.insert(schema.repHistory).values({
    userId,
    amount,
    reason,
    questionId: questionId || null,
    answerId: answerId || null,
  });
}

export async function removeRep(
  userId: number,
  reason: RepReason,
  questionId?: number,
  answerId?: number
) {
  const amount = REP_VALUES[reason];

  await db
    .update(schema.users)
    .set({ reputation: sql`GREATEST(1, ${schema.users.reputation} - ${amount})` })
    .where(eq(schema.users.id, userId));
}
