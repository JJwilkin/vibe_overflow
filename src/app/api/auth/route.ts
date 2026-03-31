import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// GET /api/auth — get current user
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ user: null });
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.authId, authUser.id));

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      reputation: user.reputation,
    },
  });
}

// DELETE /api/auth — log out
export async function DELETE() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
