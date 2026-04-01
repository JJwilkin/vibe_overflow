import { db, schema } from "../db";
import { eq, and, lte, sql } from "drizzle-orm";
import { pickRandomPersonas } from "./personas";

export async function enqueueAIResponses(questionId: number, excludePersonaId?: string) {
  if (process.env.AI_ENABLED === "false") return;

  const count = Math.floor(Math.random() * 3) + 2; // 2-4 responses
  const selectedPersonas = pickRandomPersonas(count, excludePersonaId);

  for (let i = 0; i < selectedPersonas.length; i++) {
    const persona = selectedPersonas[i];

    await db.insert(schema.aiJobs).values({
      questionId,
      personaId: persona.id,
      scheduledFor: new Date(),
    });
  }
}

export async function getNextPendingJob() {
  const now = new Date();
  const [job] = await db
    .select()
    .from(schema.aiJobs)
    .where(
      and(
        eq(schema.aiJobs.status, "pending"),
        lte(schema.aiJobs.scheduledFor, now)
      )
    )
    .limit(1);
  return job;
}

export async function markJobProcessing(jobId: number) {
  await db
    .update(schema.aiJobs)
    .set({ status: "processing", startedAt: new Date() })
    .where(eq(schema.aiJobs.id, jobId));
}

export async function markJobCompleted(jobId: number) {
  await db
    .update(schema.aiJobs)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(schema.aiJobs.id, jobId));
}

const MAX_BOT_COMMENTS_PER_THREAD = 3;

/**
 * Enqueue 1-2 bot comment replies when a user posts a comment.
 * Respects a per-answer/question thread limit to prevent infinite chains.
 */
export async function enqueueCommentReplies(
  questionId: number,
  answerId: number | null,
) {
  if (process.env.AI_ENABLED === "false") return;

  // Count existing bot comments on this thread
  const threadFilter = answerId
    ? eq(schema.comments.answerId, answerId)
    : and(
        eq(schema.comments.questionId, questionId),
        sql`${schema.comments.answerId} IS NULL`
      );

  const botComments = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.comments)
    .innerJoin(schema.users, eq(schema.comments.userId, schema.users.id))
    .where(and(threadFilter!, eq(schema.users.isBot, true)));

  const botCount = Number(botComments[0]?.count ?? 0);
  if (botCount >= MAX_BOT_COMMENTS_PER_THREAD) return;

  // Also count pending/processing comment jobs for this thread
  const pendingJobs = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.aiJobs)
    .where(
      and(
        eq(schema.aiJobs.questionId, questionId),
        answerId
          ? eq(schema.aiJobs.answerId, answerId)
          : sql`${schema.aiJobs.answerId} IS NULL`,
        eq(schema.aiJobs.jobType, "comment"),
        sql`${schema.aiJobs.status} IN ('pending', 'processing')`
      )
    );

  const totalUpcoming = botCount + Number(pendingJobs[0]?.count ?? 0);
  if (totalUpcoming >= MAX_BOT_COMMENTS_PER_THREAD) return;

  const slotsLeft = MAX_BOT_COMMENTS_PER_THREAD - totalUpcoming;
  const count = Math.min(Math.floor(Math.random() * 2) + 1, slotsLeft); // 1-2 replies
  const selected = pickRandomPersonas(count);

  for (const persona of selected) {
    const delaySec = 3 + Math.floor(Math.random() * 10); // 3-13s
    await db.insert(schema.aiJobs).values({
      questionId,
      answerId: answerId ?? undefined,
      jobType: "comment",
      personaId: persona.id,
      scheduledFor: new Date(Date.now() + delaySec * 1000),
    });
  }
}

/**
 * Enqueue a mention-triggered bot reply. Bypasses the per-thread comment limit.
 */
export async function enqueueMentionReply(
  questionId: number,
  answerId: number | null,
  personaId: string,
) {
  if (process.env.AI_ENABLED === "false") return;

  const delaySec = 2 + Math.floor(Math.random() * 5); // 2-7s
  await db.insert(schema.aiJobs).values({
    questionId,
    answerId: answerId ?? undefined,
    jobType: "comment",
    personaId,
    scheduledFor: new Date(Date.now() + delaySec * 1000),
  });
}

export async function markJobFailed(jobId: number, error: string, attempts: number) {
  const status = attempts >= 3 ? "failed" : "pending";
  await db
    .update(schema.aiJobs)
    .set({ status, error, attempts })
    .where(eq(schema.aiJobs.id, jobId));
}
