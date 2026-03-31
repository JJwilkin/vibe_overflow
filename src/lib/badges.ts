import { db, schema } from "./db";
import { eq, sql } from "drizzle-orm";

export interface Badge {
  id: string;
  name: string;
  description: string;
  tier: "gold" | "silver" | "bronze";
}

export const badgeDefinitions: Badge[] = [
  { id: "enlightened", name: "Enlightened", description: "Answer score of 10 or more", tier: "gold" },
  { id: "guru", name: "Guru", description: "Accepted answer with score of 5 or more", tier: "gold" },
  { id: "verbose", name: "Verbose", description: "Wrote an answer over 2000 characters", tier: "silver" },
  { id: "critic", name: "Critic", description: "First downvote cast", tier: "bronze" },
  { id: "supporter", name: "Supporter", description: "First upvote cast", tier: "bronze" },
  { id: "teacher", name: "Teacher", description: "Answered a question with score of 1 or more", tier: "bronze" },
  { id: "commentator", name: "Commentator", description: "Left 10 comments", tier: "bronze" },
  { id: "scholar", name: "Scholar", description: "Asked a question and accepted an answer", tier: "bronze" },
  { id: "snarky", name: "Snarky", description: "Left 50 comments", tier: "silver" },
  { id: "archaeologist", name: "Archaeologist", description: "Answered 10 questions", tier: "silver" },
  { id: "broken_record", name: "Broken Record", description: "Cast 5 close votes", tier: "silver" },
  { id: "fanatic", name: "Fanatic", description: "Earned 1000 reputation", tier: "gold" },
];

export async function computeBadgesForUser(userId: number): Promise<Badge[]> {
  const earned: Badge[] = [];

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!user) return [];

  const answers = await db
    .select({
      id: schema.answers.id,
      score: schema.answers.score,
      isAccepted: schema.answers.isAccepted,
      body: schema.answers.body,
    })
    .from(schema.answers)
    .where(eq(schema.answers.userId, userId));

  const questions = await db
    .select({
      id: schema.questions.id,
      acceptedAnswerId: schema.questions.acceptedAnswerId,
    })
    .from(schema.questions)
    .where(eq(schema.questions.userId, userId));

  const [upvotes] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.votes)
    .where(sql`${schema.votes.userId} = ${userId} AND ${schema.votes.value} = 1`);

  const [downvotes] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.votes)
    .where(sql`${schema.votes.userId} = ${userId} AND ${schema.votes.value} = -1`);

  const [commentCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.comments)
    .where(eq(schema.comments.userId, userId));

  const [closeVoteCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.closeVotes)
    .where(eq(schema.closeVotes.userId, userId));

  if (answers.some((a) => a.score >= 10)) earned.push(badgeDefinitions.find((b) => b.id === "enlightened")!);
  if (answers.some((a) => a.isAccepted && a.score >= 5)) earned.push(badgeDefinitions.find((b) => b.id === "guru")!);
  if (answers.some((a) => a.body.length > 2000)) earned.push(badgeDefinitions.find((b) => b.id === "verbose")!);
  if ((downvotes?.count || 0) > 0) earned.push(badgeDefinitions.find((b) => b.id === "critic")!);
  if ((upvotes?.count || 0) > 0) earned.push(badgeDefinitions.find((b) => b.id === "supporter")!);
  if (answers.some((a) => a.score >= 1)) earned.push(badgeDefinitions.find((b) => b.id === "teacher")!);
  if ((commentCount?.count || 0) >= 10) earned.push(badgeDefinitions.find((b) => b.id === "commentator")!);
  if ((commentCount?.count || 0) >= 50) earned.push(badgeDefinitions.find((b) => b.id === "snarky")!);
  if (questions.some((q) => q.acceptedAnswerId !== null)) earned.push(badgeDefinitions.find((b) => b.id === "scholar")!);
  if (answers.length >= 10) earned.push(badgeDefinitions.find((b) => b.id === "archaeologist")!);
  if ((closeVoteCount?.count || 0) >= 5) earned.push(badgeDefinitions.find((b) => b.id === "broken_record")!);
  if (user.reputation >= 1000) earned.push(badgeDefinitions.find((b) => b.id === "fanatic")!);

  return earned;
}
