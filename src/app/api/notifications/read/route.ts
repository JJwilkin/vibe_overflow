import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/session";

// POST /api/notifications/read — mark all notifications as read
export async function POST() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  await db
    .update(schema.notifications)
    .set({ read: true })
    .where(
      and(
        eq(schema.notifications.userId, user.id),
        eq(schema.notifications.read, false)
      )
    );

  return NextResponse.json({ ok: true });
}
