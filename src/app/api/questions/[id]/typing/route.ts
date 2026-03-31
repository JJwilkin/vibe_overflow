import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, or } from "drizzle-orm";

// GET /api/questions/[id]/typing — who is currently "typing"
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const questionId = parseInt(id);

  const activeJobs = await db
    .select({
      personaId: schema.aiJobs.personaId,
      jobType: schema.aiJobs.jobType,
      userName: schema.users.displayName,
      avatar: schema.users.avatarUrl,
    })
    .from(schema.aiJobs)
    .innerJoin(
      schema.users,
      eq(schema.aiJobs.personaId, schema.users.personaId)
    )
    .where(
      and(
        eq(schema.aiJobs.questionId, questionId),
        or(
          eq(schema.aiJobs.status, "processing"),
          eq(schema.aiJobs.status, "pending")
        )
      )
    );

  const typing = activeJobs.map((j) => ({
    name: j.userName,
    avatar: j.avatar,
    status: "typing",
  }));

  return NextResponse.json({ typing });
}
