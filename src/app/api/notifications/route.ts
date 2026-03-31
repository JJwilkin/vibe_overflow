import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/session";

// GET /api/notifications — list notifications for current user
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  const notifications = await db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, user.id))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(30);

  const [unread] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, user.id),
        eq(schema.notifications.read, false)
      )
    );

  return NextResponse.json({
    notifications,
    unreadCount: Number(unread?.count ?? 0),
  });
}
