import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, lte, sql } from "drizzle-orm";
import { getPersona, pickRivalFor, getCommentPrompt } from "@/lib/ai/personas";
import { generateResponse } from "@/lib/ai/generate";

const MAX_JOBS_PER_RUN = 5;
const COMMENT_PROBABILITY = 0.4;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let processed = 0;

  for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
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

    if (!job) break;

    const persona = getPersona(job.personaId);
    if (!persona) {
      await db
        .update(schema.aiJobs)
        .set({ status: "failed", error: `Unknown persona: ${job.personaId}`, attempts: 3 })
        .where(eq(schema.aiJobs.id, job.id));
      processed++;
      continue;
    }

    await db
      .update(schema.aiJobs)
      .set({ status: "processing", startedAt: new Date() })
      .where(eq(schema.aiJobs.id, job.id));

    try {
      if (job.jobType === "comment" && job.answerId) {
        await processComment(job, persona);
      } else {
        await processAnswer(job, persona);
      }
      await db
        .update(schema.aiJobs)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(schema.aiJobs.id, job.id));
      processed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const newAttempts = job.attempts + 1;
      await db
        .update(schema.aiJobs)
        .set({
          status: newAttempts >= 3 ? "failed" : "pending",
          error: message,
          attempts: newAttempts,
        })
        .where(eq(schema.aiJobs.id, job.id));
      processed++;
    }
  }

  // Inflate views occasionally
  await maybeInflateViews();

  return NextResponse.json({ processed });
}

async function processAnswer(
  job: typeof schema.aiJobs.$inferSelect,
  persona: NonNullable<ReturnType<typeof getPersona>>
) {
  const [question] = await db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.id, job.questionId));
  if (!question) return;

  const existingAnswers = await db
    .select({ body: schema.answers.body, userName: schema.users.displayName })
    .from(schema.answers)
    .innerJoin(schema.users, eq(schema.answers.userId, schema.users.id))
    .where(eq(schema.answers.questionId, job.questionId));

  const responseText = await generateResponse(persona, question, existingAnswers);

  const [botUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.personaId, persona.id));
  if (!botUser) return;

  const [answer] = await db
    .insert(schema.answers)
    .values({ body: responseText, questionId: job.questionId, userId: botUser.id })
    .returning();

  // Maybe enqueue rival comment
  if (Math.random() < COMMENT_PROBABILITY) {
    const rival = pickRivalFor(persona.id);
    if (rival) {
      const delaySec = 60 + Math.floor(Math.random() * 300);
      await db.insert(schema.aiJobs).values({
        questionId: job.questionId,
        answerId: answer.id,
        jobType: "comment",
        personaId: rival.id,
        scheduledFor: new Date(Date.now() + delaySec * 1000),
      });
    }
  }
}

async function processComment(
  job: typeof schema.aiJobs.$inferSelect,
  persona: NonNullable<ReturnType<typeof getPersona>>
) {
  if (!job.answerId) return;

  const [answer] = await db
    .select({ body: schema.answers.body, userName: schema.users.displayName })
    .from(schema.answers)
    .innerJoin(schema.users, eq(schema.answers.userId, schema.users.id))
    .where(eq(schema.answers.id, job.answerId));
  if (!answer) return;

  const [question] = await db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.id, job.questionId));
  if (!question) return;

  const commentSystemPrompt = getCommentPrompt(persona);
  const prompt = `Question: ${question.title}\n\n[${answer.userName}]'s answer:\n${answer.body}\n\nWrite a brief comment reacting to this answer:`;

  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "mistral";

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      system: commentSystemPrompt,
      stream: false,
      options: { temperature: 0.9, num_predict: 100 },
    }),
  });

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`);

  const data = await response.json();
  const commentText = data.response.trim();

  const [botUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.personaId, persona.id));
  if (!botUser) return;

  await db.insert(schema.comments).values({
    body: commentText,
    userId: botUser.id,
    answerId: job.answerId,
    questionId: job.questionId,
  });
}

async function maybeInflateViews() {
  // Only inflate ~20% of the time (roughly every 5 minutes at 1/min cron)
  if (Math.random() > 0.2) return;

  const questions = await db
    .select({
      id: schema.questions.id,
      score: schema.questions.score,
      viewCount: schema.questions.viewCount,
    })
    .from(schema.questions);

  for (const q of questions) {
    const weight = Math.max(1, q.score + 1);
    const bump = Math.floor(Math.random() * weight * 3) + 1;
    if (Math.random() < 0.6) {
      await db
        .update(schema.questions)
        .set({ viewCount: q.viewCount + bump })
        .where(eq(schema.questions.id, q.id));
    }
  }
}
