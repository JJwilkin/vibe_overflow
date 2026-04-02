import { db, schema } from "../db";
import { eq, and, sql, desc } from "drizzle-orm";
import { rivalries } from "./personas";

// ── Sentiment Extraction ──

type Sentiment = "positive" | "negative" | "neutral";

export function extractSentiment(text: string): { cleanText: string; sentiment: Sentiment } {
  const match = text.match(/\[SENTIMENT:(positive|negative|neutral)\]\s*$/);
  if (match) {
    return {
      cleanText: text.replace(/\s*\[SENTIMENT:\w+\]\s*$/, "").trim(),
      sentiment: match[1] as Sentiment,
    };
  }
  return { cleanText: text.trim(), sentiment: "neutral" };
}

export function inferAnswerSentiment(answerText: string, targetName: string): Sentiment {
  const lower = answerText.toLowerCase();
  const nameIdx = lower.indexOf(targetName.toLowerCase());
  if (nameIdx === -1) return "neutral";

  const context = lower.slice(Math.max(0, nameIdx - 100), nameIdx + 200);
  const negSignals = ["wrong", "incorrect", "terrible", "disagree", "actually no", "sigh", "lmao", "skill issue", "not even close", "don't listen"];
  const posSignals = ["great point", "agree", "exactly", "good answer", "well said", "correct"];

  const negHits = negSignals.filter((s) => context.includes(s)).length;
  const posHits = posSignals.filter((s) => context.includes(s)).length;

  if (negHits > posHits) return "negative";
  if (posHits > negHits) return "positive";
  return "neutral";
}

// ── Recording Interactions ──

export async function recordBotInteraction(
  actorPersonaId: string,
  targetPersonaId: string,
  interactionType: "comment" | "answer",
  sentiment: Sentiment,
  snippet: string,
  questionId?: number,
  answerId?: number,
) {
  // 1. Insert interaction log
  await db.insert(schema.botInteractions).values({
    actorPersonaId,
    targetPersonaId,
    interactionType,
    sentiment,
    snippet: snippet.slice(0, 120),
    questionId,
    answerId,
  });

  // 2. Upsert actor→target relationship
  const actorDelta = sentiment === "positive" ? 2 : sentiment === "negative" ? -2 : 0;
  if (actorDelta !== 0) {
    await upsertRelationship(actorPersonaId, targetPersonaId, actorDelta, snippet.slice(0, 120));
  }

  // 3. Upsert target→actor (asymmetric: target remembers more)
  const targetDelta = sentiment === "positive" ? 1 : sentiment === "negative" ? -3 : 0;
  if (targetDelta !== 0) {
    await upsertRelationship(targetPersonaId, actorPersonaId, targetDelta, snippet.slice(0, 120));
  }
}

async function upsertRelationship(personaId: string, targetPersonaId: string, scoreDelta: number, snippet: string) {
  await db
    .insert(schema.botRelationships)
    .values({
      personaId,
      targetPersonaId,
      score: scoreDelta,
      interactionCount: 1,
      lastSnippet: snippet,
    })
    .onConflictDoUpdate({
      target: [schema.botRelationships.personaId, schema.botRelationships.targetPersonaId],
      set: {
        score: sql`GREATEST(-20, LEAST(20, ${schema.botRelationships.score} + ${scoreDelta}))`,
        interactionCount: sql`${schema.botRelationships.interactionCount} + 1`,
        lastSnippet: snippet,
        updatedAt: new Date(),
      },
    });
}

// ── Relationship Context for Prompts ──

function applyDecay(score: number, updatedAt: Date): number {
  const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  const decaySteps = Math.floor(daysSinceUpdate / 7);
  if (decaySteps > 0 && score !== 0) {
    return score > 0 ? Math.max(0, score - decaySteps) : Math.min(0, score + decaySteps);
  }
  return score;
}

export async function buildRelationshipContext(
  actorPersonaId: string,
  targetPersonaId: string,
  targetDisplayName: string,
): Promise<string | null> {
  const [relationship] = await db
    .select()
    .from(schema.botRelationships)
    .where(
      and(
        eq(schema.botRelationships.personaId, actorPersonaId),
        eq(schema.botRelationships.targetPersonaId, targetPersonaId),
      )
    )
    .limit(1);

  if (!relationship || relationship.interactionCount === 0) return null;

  const score = applyDecay(relationship.score, relationship.updatedAt);
  if (score > -3 && score < 3) return null; // neutral — no context

  // Fetch most recent interaction snippet
  const [recentInteraction] = await db
    .select({ snippet: schema.botInteractions.snippet })
    .from(schema.botInteractions)
    .where(
      and(
        eq(schema.botInteractions.actorPersonaId, actorPersonaId),
        eq(schema.botInteractions.targetPersonaId, targetPersonaId),
      )
    )
    .orderBy(desc(schema.botInteractions.createdAt))
    .limit(1);

  let context = `\n--- RELATIONSHIP CONTEXT ---\nYou have a history with ${targetDisplayName}. `;

  if (score <= -8) {
    context += `You find them insufferable. You've clashed ${relationship.interactionCount} times. `;
  } else if (score <= -3) {
    context += `They tend to get on your nerves. You've had ${relationship.interactionCount} interactions. `;
  } else if (score >= 8) {
    context += `You actually respect them (rare for you). You've had ${relationship.interactionCount} positive exchanges. `;
  } else if (score >= 3) {
    context += `You find them somewhat tolerable, which is high praise from you. `;
  }

  if (recentInteraction?.snippet) {
    context += `They recently said: "${recentInteraction.snippet}" `;
  }

  if (score <= -3) {
    context += `Feel free to reference past disagreements. Be extra cutting.`;
  } else {
    context += `You might defend them or build on their points.`;
  }

  context += `\n--- END RELATIONSHIP CONTEXT ---`;
  return context;
}

// ── Selection Bias ──

export async function getRelationshipBoosts(
  targetPersonaId: string,
): Promise<Map<string, number>> {
  const relationships = await db
    .select({
      personaId: schema.botRelationships.personaId,
      score: schema.botRelationships.score,
    })
    .from(schema.botRelationships)
    .where(eq(schema.botRelationships.targetPersonaId, targetPersonaId));

  const boosts = new Map<string, number>();
  for (const rel of relationships) {
    const boost = Math.abs(rel.score) / 20; // 0.0 to 1.0
    if (boost > 0.1) boosts.set(rel.personaId, boost);
  }
  return boosts;
}

// ── Seeding ──

export async function seedRelationshipsFromRivalries(): Promise<void> {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.botRelationships);

  if (Number(countResult?.count) > 0) return;

  console.log("  🌱 Seeding bot relationships from rivalry map...");
  for (const [personaId, targets] of Object.entries(rivalries)) {
    for (const targetId of targets) {
      await upsertRelationship(personaId, targetId, -5, "Pre-existing rivalry");
      await upsertRelationship(targetId, personaId, -5, "Pre-existing rivalry");
    }
  }
  console.log("  ✓ Seeded initial rivalries");
}
