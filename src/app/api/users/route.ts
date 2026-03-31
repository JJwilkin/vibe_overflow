import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql, desc } from "drizzle-orm";

// GET /api/users — list all users
export async function GET() {
  const users = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatarUrl: schema.users.avatarUrl,
      isBot: schema.users.isBot,
      personaId: schema.users.personaId,
      reputation: schema.users.reputation,
      createdAt: schema.users.createdAt,
      answerCount:
        sql<number>`(SELECT COUNT(*) FROM answers WHERE answers.user_id = ${schema.users.id})`,
      questionCount:
        sql<number>`(SELECT COUNT(*) FROM questions WHERE questions.user_id = ${schema.users.id})`,
    })
    .from(schema.users)
    .orderBy(desc(schema.users.reputation));

  return NextResponse.json({ users });
}
