import { db, schema } from "../db";
import { eq, and, lte } from "drizzle-orm";
import { pickRandomPersonas } from "./personas";

export async function enqueueAIResponses(questionId: number) {
  if (process.env.AI_ENABLED === "false") return;

  const count = Math.floor(Math.random() * 3) + 2; // 2-4 responses
  const selectedPersonas = pickRandomPersonas(count);

  for (let i = 0; i < selectedPersonas.length; i++) {
    const persona = selectedPersonas[i];
    const [minDelay, maxDelay] = persona.responseDelay;
    const delaySec =
      minDelay + Math.floor(Math.random() * (maxDelay - minDelay));
    const scheduledFor = new Date(Date.now() + delaySec * 1000);

    await db.insert(schema.aiJobs).values({
      questionId,
      personaId: persona.id,
      scheduledFor,
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

export async function markJobFailed(jobId: number, error: string, attempts: number) {
  const status = attempts >= 3 ? "failed" : "pending";
  await db
    .update(schema.aiJobs)
    .set({ status, error, attempts })
    .where(eq(schema.aiJobs.id, jobId));
}
