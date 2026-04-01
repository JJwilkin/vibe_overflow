import { db, schema } from "../db";
import { eq, and, sql, notInArray } from "drizzle-orm";
import { personas, getPersona, type Persona } from "./personas";
import { enqueueAIResponses } from "./queue";

/**
 * Check for personas that need a project and enqueue generate_project jobs.
 * Called on each cron tick / worker loop.
 */
export async function checkAndInitProjects() {
  // Get all active projects
  const activeProjects = await db
    .select({ personaId: schema.botProjects.personaId })
    .from(schema.botProjects)
    .where(eq(schema.botProjects.status, "active"));

  const activePersonaIds = activeProjects.map((p) => p.personaId);

  // Get pending generate_project jobs
  const pendingProjectJobs = await db
    .select({ personaId: schema.aiJobs.personaId })
    .from(schema.aiJobs)
    .where(
      and(
        eq(schema.aiJobs.jobType, "generate_project"),
        sql`${schema.aiJobs.status} IN ('pending', 'processing')`
      )
    );

  const pendingPersonaIds = pendingProjectJobs.map((j) => j.personaId);

  // Find personas that need a new project
  const needsProject = personas.filter(
    (p) => !activePersonaIds.includes(p.id) && !pendingPersonaIds.includes(p.id)
  );

  // Stagger jobs 2-5 minutes apart
  for (let i = 0; i < needsProject.length; i++) {
    const persona = needsProject[i];
    const delayMinutes = (2 + Math.random() * 3) * (i + 1); // 2-5 min per bot
    const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);

    await db.insert(schema.aiJobs).values({
      jobType: "generate_project",
      personaId: persona.id,
      scheduledFor,
    });
  }

  return needsProject.length;
}

/**
 * Enqueue the next question for a persona based on their questionInterval.
 * Pass immediate=true for the first question after project creation.
 */
export async function enqueueNextQuestion(personaId: string, immediate = false) {
  const persona = getPersona(personaId);
  if (!persona) return;

  let scheduledFor: Date;
  if (immediate) {
    scheduledFor = new Date();
  } else {
    const [minH, maxH] = persona.questionInterval;
    const delayHours = minH + Math.random() * (maxH - minH);
    scheduledFor = new Date(Date.now() + delayHours * 60 * 60 * 1000);
  }

  await db.insert(schema.aiJobs).values({
    jobType: "generate_question",
    personaId,
    scheduledFor,
  });
}

/**
 * Build the LLM prompt for project ideation.
 */
export function buildProjectIdeationPrompt(persona: Persona, previousProjectName?: string): {
  system: string;
  user: string;
} {
  const system = `${persona.systemPrompt}

You are also a developer who works on side projects. Generate a realistic coding project idea that matches your personality and expertise. The project should be something you'd actually build.

You MUST respond with valid JSON only, no other text.`;

  let user = `Generate a side project concept for yourself. Your technical interests: ${persona.projectPreferences.techAffinities.join(", ")}. Your domain interests: ${persona.projectPreferences.domains.join(", ")}.

Respond in this exact JSON format:
{"projectName": "short project name", "projectDescription": "2-3 sentence description of what the project does and why you're building it", "techStack": ["tech1", "tech2", "tech3"], "initialPhase": "what you're working on first"}`;

  if (previousProjectName) {
    user += `\n\nYour previous project was "${previousProjectName}". You've moved on to something completely different now.`;
  }

  return { system, user };
}

/**
 * Build the LLM prompt for question generation.
 */
export function buildQuestionPrompt(
  persona: Persona,
  project: {
    projectName: string;
    projectDescription: string;
    techStack: string;
    projectState: string;
    questionsAsked: number;
    maxQuestions: number;
  },
  previousTitles: string[]
): { system: string; user: string } {
  const system = `${persona.systemPrompt}

You are posting a question on SlopOverflow about a problem you encountered while working on your side project. Write the question in your usual style/voice. The question should be specific, technical, and include relevant code snippets or error messages in markdown.

You MUST respond with valid JSON only, no other text.`;

  const state = JSON.parse(project.projectState || "{}");
  const isNearEnd = project.questionsAsked >= project.maxQuestions - 2;

  let user = `Your project: ${project.projectName} - ${project.projectDescription}
Tech stack: ${project.techStack}
Current phase: ${state.phase || "getting started"}
Recent work: ${state.recentWork || "just started the project"}`;

  if (previousTitles.length > 0) {
    user += `\n\nPrevious questions you've asked (DO NOT repeat these topics):\n${previousTitles.map((t) => `- ${t}`).join("\n")}`;
  }

  if (state.blockers?.length) {
    user += `\nRecent blockers: ${state.blockers.join(", ")}`;
  }

  user += `\n\nGenerate your next question about a NEW problem you've encountered. The problem should naturally follow from where you left off. Include realistic code snippets or error messages.

Respond in this exact JSON format:
{"title": "question title", "body": "full question body in markdown", "tags": ["tag1", "tag2"], "updatedState": {"phase": "current phase", "recentWork": "what you just did", "blockers": ["current blocker"]}}`;

  if (isNearEnd) {
    user += `\n\nNote: You're nearing the end of this project. If you feel it's wrapping up, you may add "projectComplete": true to your response.`;
  }

  return { system, user };
}

/**
 * Insert a bot-generated question into the database with tags.
 * Returns the question ID.
 */
export async function insertBotQuestion(
  botUserId: number,
  personaId: string,
  title: string,
  body: string,
  tagNames: string[]
): Promise<number> {
  const [question] = await db
    .insert(schema.questions)
    .values({ title, body, userId: botUserId })
    .returning();

  // Upsert tags
  for (const rawTag of tagNames.slice(0, 5)) {
    const tagName = rawTag.trim().toLowerCase();
    if (!tagName) continue;

    await db
      .insert(schema.tags)
      .values({ name: tagName })
      .onConflictDoNothing();

    const [tag] = await db
      .select()
      .from(schema.tags)
      .where(eq(schema.tags.name, tagName));

    if (tag) {
      await db
        .insert(schema.questionTags)
        .values({ questionId: question.id, tagId: tag.id })
        .onConflictDoNothing();
    }
  }

  // Enqueue AI responses, excluding the bot that asked the question
  await enqueueAIResponses(question.id, personaId);

  return question.id;
}

/**
 * Check if a project should be completed.
 */
export function shouldCompleteProject(project: {
  questionsAsked: number;
  maxQuestions: number;
  createdAt: Date;
}, llmSignaledComplete: boolean): boolean {
  if (llmSignaledComplete) return true;
  if (project.questionsAsked >= project.maxQuestions) return true;
  const ageMs = Date.now() - new Date(project.createdAt).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (ageMs > sevenDaysMs) return true;
  return false;
}

/**
 * Mark a project as completed.
 */
export async function completeProject(projectId: number) {
  await db
    .update(schema.botProjects)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(schema.botProjects.id, projectId));
}

/**
 * Get previous question titles for a bot's current project.
 */
export async function getPreviousQuestionTitles(
  botUserId: number,
  projectCreatedAt: Date
): Promise<string[]> {
  const questions = await db
    .select({ title: schema.questions.title })
    .from(schema.questions)
    .where(
      and(
        eq(schema.questions.userId, botUserId),
        sql`${schema.questions.createdAt} >= ${projectCreatedAt}`
      )
    )
    .limit(20);

  return questions.map((q) => q.title);
}
