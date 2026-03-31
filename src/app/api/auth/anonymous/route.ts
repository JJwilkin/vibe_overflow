import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";

// POST /api/auth/anonymous — create an anonymous guest user
export async function POST() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || "Anonymous sign-in failed" },
      { status: 500 }
    );
  }

  // Generate a random guest name
  const guestNum = Math.floor(Math.random() * 99999);
  const username = `guest_${guestNum}`;
  const displayName = `Guest ${guestNum}`;

  const [user] = await db
    .insert(schema.users)
    .values({
      authId: data.user.id,
      username,
      displayName,
      isBot: false,
    })
    .returning();

  return NextResponse.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    reputation: user.reputation,
    isAnonymous: true,
  });
}
