import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { getPersona, pickRivalFor, getCommentPrompt } from "./personas";
import { generateResponse, callLLM } from "./generate";
import {
  getNextPendingJob,
  markJobProcessing,
  markJobCompleted,
  markJobFailed,
} from "./queue";

const POLL_INTERVAL = 5_000; // 5 seconds
const COMMENT_PROBABILITY = 0.4; // 40% chance a bot answer triggers a rival comment

async function processNextJob(): Promise<boolean> {
  const job = await getNextPendingJob();
  if (!job) return false;

  const persona = getPersona(job.personaId);
  if (!persona) {
    await markJobFailed(job.id, `Unknown persona: ${job.personaId}`, 3);
    return true;
  }

  await markJobProcessing(job.id);

  try {
    if (job.jobType === "comment") {
      await processCommentJob(job, persona);
    } else {
      await processAnswerJob(job, persona);
    }
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `  ✗ Failed for ${persona.displayName}: ${message}`
    );
    await markJobFailed(job.id, message, job.attempts + 1);
    return true;
  }
}

async function processAnswerJob(
  job: { id: number; questionId: number; personaId: string; attempts: number },
  persona: ReturnType<typeof getPersona> & {}
) {
  const [question] = await db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.id, job.questionId));

  if (!question) {
    await markJobFailed(job.id, "Question not found", 3);
    return;
  }

  const existingAnswers = await db
    .select({
      body: schema.answers.body,
      userName: schema.users.displayName,
    })
    .from(schema.answers)
    .innerJoin(schema.users, eq(schema.answers.userId, schema.users.id))
    .where(eq(schema.answers.questionId, job.questionId));

  console.log(
    `  Generating answer as ${persona.displayName} for question #${job.questionId}...`
  );
  const responseText = await generateResponse(
    persona,
    question,
    existingAnswers
  );

  const [botUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.personaId, persona.id));

  if (!botUser) {
    await markJobFailed(job.id, `Bot user not found for persona: ${persona.id}`, 3);
    return;
  }

  const [answer] = await db
    .insert(schema.answers)
    .values({
      body: responseText,
      questionId: job.questionId,
      userId: botUser.id,
    })
    .returning();

  // Bot voting on the question
  if (persona.votePattern !== "never_votes") {
    const voteValue = getVoteValue(persona.votePattern);
    if (voteValue !== 0) {
      try {
        await db.insert(schema.votes).values({
          userId: botUser.id,
          questionId: job.questionId,
          value: voteValue,
        });
        await db
          .update(schema.questions)
          .set({ score: question.score + voteValue })
          .where(eq(schema.questions.id, job.questionId));
      } catch {
        // Ignore duplicate vote errors
      }
    }
  }

  // Maybe cast a close vote
  const closeVoteChance = getCloseVoteChance(persona.id);
  if (Math.random() < closeVoteChance) {
    const reasons = [
      "Needs more focus",
      "Opinion-based",
      "Needs debugging details",
      "Not reproducible or was caused by a typo",
      "This question already has answers elsewhere",
    ];
    const reason = reasons[Math.floor(Math.random() * reasons.length)];
    try {
      await db.insert(schema.closeVotes).values({
        userId: botUser.id,
        questionId: job.questionId,
        reason,
      });
      console.log(
        `  🚫 ${persona.displayName} voted to close: "${reason}"`
      );
    } catch {
      // Ignore duplicates
    }
  }

  await markJobCompleted(job.id);
  console.log(
    `  ✓ ${persona.displayName} answered question #${job.questionId}`
  );

  // Maybe enqueue a rival comment on this answer
  if (Math.random() < COMMENT_PROBABILITY) {
    const rival = pickRivalFor(persona.id);
    if (rival) {
      const delaySec = 60 + Math.floor(Math.random() * 300); // 1-6 min after the answer
      const scheduledFor = new Date(Date.now() + delaySec * 1000);
      await db.insert(schema.aiJobs).values({
        questionId: job.questionId,
        answerId: answer.id,
        jobType: "comment",
        personaId: rival.id,
        scheduledFor,
      });
      console.log(
        `  📝 Enqueued comment from ${rival.displayName} on ${persona.displayName}'s answer`
      );
    }
  }
}

async function processCommentJob(
  job: { id: number; questionId: number; answerId?: number | null; personaId: string; attempts: number },
  persona: ReturnType<typeof getPersona> & {}
) {
  if (!job.answerId) {
    await markJobFailed(job.id, "Comment job missing answerId", 3);
    return;
  }

  const [answer] = await db
    .select({
      body: schema.answers.body,
      userName: schema.users.displayName,
    })
    .from(schema.answers)
    .innerJoin(schema.users, eq(schema.answers.userId, schema.users.id))
    .where(eq(schema.answers.id, job.answerId));

  if (!answer) {
    await markJobFailed(job.id, "Answer not found for comment", 3);
    return;
  }

  const [question] = await db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.id, job.questionId));

  if (!question) {
    await markJobFailed(job.id, "Question not found", 3);
    return;
  }

  console.log(
    `  💬 Generating comment as ${persona.displayName} on answer #${job.answerId}...`
  );

  const commentSystemPrompt = getCommentPrompt(persona);
  const prompt = `Question: ${question.title}\n\n[${answer.userName}]'s answer:\n${answer.body}\n\nWrite a brief comment reacting to this answer:`;

  const commentText = await callLLM(commentSystemPrompt, prompt, {
    temperature: 0.9,
    maxTokens: 100,
  });

  const [botUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.personaId, persona.id));

  if (!botUser) {
    await markJobFailed(job.id, `Bot user not found for persona: ${persona.id}`, 3);
    return;
  }

  await db.insert(schema.comments).values({
    body: commentText,
    userId: botUser.id,
    answerId: job.answerId,
    questionId: job.questionId,
  });

  await markJobCompleted(job.id);
  console.log(
    `  ✓ ${persona.displayName} commented on answer #${job.answerId}`
  );
}

function getCloseVoteChance(personaId: string): number {
  switch (personaId) {
    case "snarky_sam": return 0.4;
    case "duplicate_dave": return 0.5;
    case "condescending_carl": return 0.15;
    case "actually_alice": return 0.1;
    case "passive_pete": return 0.2;
    case "helpful_helen": return 0;
    case "verbose_vanessa": return 0;
    case "outdated_oscar": return 0.05;
    default: return 0;
  }
}

function getVoteValue(
  pattern: "mostly_downvotes" | "mostly_upvotes" | "mixed"
): number {
  const rand = Math.random();
  switch (pattern) {
    case "mostly_upvotes":
      return rand < 0.8 ? 1 : rand < 0.95 ? -1 : 0;
    case "mostly_downvotes":
      return rand < 0.7 ? -1 : rand < 0.85 ? 1 : 0;
    case "mixed":
      return rand < 0.4 ? 1 : rand < 0.8 ? -1 : 0;
  }
}

let viewInflationCounter = 0;

async function inflateViews() {
  viewInflationCounter++;
  if (viewInflationCounter % 5 !== 0) return;

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

async function pollLoop() {
  console.log("🤖 AI Worker started. Polling every 30 seconds...\n");

  while (true) {
    try {
      let processed = true;
      while (processed) {
        processed = await processNextJob();
      }
      await inflateViews();
    } catch (error) {
      console.error("Worker error:", error);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
}

pollLoop();
