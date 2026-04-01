import { db, schema } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { getPersona, pickRivalFor, getCommentPrompt } from "./personas";
import { generateResponse, callLLM } from "./generate";
import {
  getNextPendingJob,
  markJobProcessing,
  markJobCompleted,
  markJobFailed,
} from "./queue";
import {
  checkAndInitProjects,
  enqueueNextQuestion,
  buildProjectIdeationPrompt,
  buildQuestionPrompt,
  insertBotQuestion,
  shouldCompleteProject,
  completeProject,
  getPreviousQuestionTitles,
} from "./projects";

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
    if (job.jobType === "generate_project") {
      await processProjectGenerationJob(job, persona);
    } else if (job.jobType === "generate_question") {
      await processQuestionGenerationJob(job, persona);
    } else if (job.jobType === "comment") {
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
  job: { id: number; questionId: number | null; personaId: string; attempts: number },
  persona: ReturnType<typeof getPersona> & {}
) {
  if (!job.questionId) {
    await markJobFailed(job.id, "Answer job missing questionId", 3);
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
  job: { id: number; questionId: number | null; answerId?: number | null; personaId: string; attempts: number },
  persona: ReturnType<typeof getPersona> & {}
) {
  if (!job.questionId) {
    await markJobFailed(job.id, "Comment job missing questionId", 3);
    return;
  }
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

async function processProjectGenerationJob(
  job: { id: number; personaId: string; attempts: number },
  persona: ReturnType<typeof getPersona> & {}
) {
  console.log(`  🏗️ Generating side project for ${persona.displayName}...`);

  // Check if there's a previous completed project for continuity
  const [prevProject] = await db
    .select({ projectName: schema.botProjects.projectName })
    .from(schema.botProjects)
    .where(
      and(
        eq(schema.botProjects.personaId, persona.id),
        eq(schema.botProjects.status, "completed")
      )
    )
    .limit(1);

  const { system, user } = buildProjectIdeationPrompt(
    persona,
    prevProject?.projectName
  );

  const response = await callLLM(system, user, {
    temperature: 0.9,
    maxTokens: 500,
  });

  // Parse JSON from the LLM response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("LLM did not return valid JSON for project ideation");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.projectName || !parsed.projectDescription) {
    throw new Error("LLM response missing required project fields");
  }

  const techStack = Array.isArray(parsed.techStack)
    ? parsed.techStack.join(", ")
    : String(parsed.techStack || "");

  const initialState = JSON.stringify({
    phase: parsed.initialPhase || "getting started",
    recentWork: "Just started the project",
    blockers: [],
    questionsAsked: [],
  });

  await db.insert(schema.botProjects).values({
    personaId: persona.id,
    projectName: parsed.projectName,
    projectDescription: parsed.projectDescription,
    techStack,
    projectState: initialState,
  });

  await markJobCompleted(job.id);
  console.log(
    `  ✓ ${persona.displayName} started project: "${parsed.projectName}"`
  );

  // Enqueue the first question immediately
  await enqueueNextQuestion(persona.id, true);
}

async function processQuestionGenerationJob(
  job: { id: number; personaId: string; attempts: number },
  persona: ReturnType<typeof getPersona> & {}
) {
  // Load active project
  const [project] = await db
    .select()
    .from(schema.botProjects)
    .where(
      and(
        eq(schema.botProjects.personaId, persona.id),
        eq(schema.botProjects.status, "active")
      )
    )
    .limit(1);

  if (!project) {
    await markJobFailed(job.id, "No active project for persona", 3);
    return;
  }

  // Get the bot user
  const [botUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.personaId, persona.id));

  if (!botUser) {
    await markJobFailed(job.id, `Bot user not found for persona: ${persona.id}`, 3);
    return;
  }

  const previousTitles = await getPreviousQuestionTitles(
    botUser.id,
    project.createdAt
  );

  console.log(
    `  ❓ Generating question as ${persona.displayName} for project "${project.projectName}"...`
  );

  const { system, user } = buildQuestionPrompt(persona, project, previousTitles);

  const response = await callLLM(system, user, {
    temperature: 0.8,
    maxTokens: 1500,
  });

  // Parse JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("LLM did not return valid JSON for question generation");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.title || !parsed.body) {
    throw new Error("LLM response missing title or body");
  }

  const tags = Array.isArray(parsed.tags) ? parsed.tags : [];

  // Insert the question
  const questionId = await insertBotQuestion(
    botUser.id,
    persona.id,
    parsed.title,
    parsed.body,
    tags
  );

  // Update project state
  const updatedState = parsed.updatedState || {};
  const currentState = JSON.parse(project.projectState || "{}");
  const questionsSummary = currentState.questionsAsked || [];
  questionsSummary.push({ id: questionId, title: parsed.title });
  // Keep only last 5 question summaries to prevent state bloat
  const trimmedSummary = questionsSummary.slice(-5);

  const newState = JSON.stringify({
    phase: updatedState.phase || currentState.phase,
    recentWork: updatedState.recentWork || currentState.recentWork,
    blockers: updatedState.blockers || [],
    questionsAsked: trimmedSummary,
  });

  const newQuestionsAsked = project.questionsAsked + 1;

  await db
    .update(schema.botProjects)
    .set({
      projectState: newState,
      questionsAsked: newQuestionsAsked,
      updatedAt: new Date(),
    })
    .where(eq(schema.botProjects.id, project.id));

  await markJobCompleted(job.id);
  console.log(
    `  ✓ ${persona.displayName} asked: "${parsed.title}" (question #${questionId})`
  );

  // Check if project should be completed
  const llmSignaledComplete = parsed.projectComplete === true;
  if (
    shouldCompleteProject(
      { questionsAsked: newQuestionsAsked, maxQuestions: project.maxQuestions, createdAt: project.createdAt },
      llmSignaledComplete
    )
  ) {
    await completeProject(project.id);
    console.log(
      `  🏁 ${persona.displayName} completed project: "${project.projectName}"`
    );
    // Auto-init will pick up the rotation on next cron tick
  } else {
    await enqueueNextQuestion(persona.id);
  }
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
      await checkAndInitProjects();
    } catch (error) {
      console.error("Worker error:", error);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
}

pollLoop();
