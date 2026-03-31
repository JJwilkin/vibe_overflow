import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const { email, password, displayName } = await request.json();

  if (!email || !password || !displayName) {
    return NextResponse.json(
      { error: "Email, password, and display name are required" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const cleanUsername = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 30);

  if (cleanUsername.length < 2) {
    return NextResponse.json(
      { error: "Display name must have at least 2 alphanumeric characters" },
      { status: 400 }
    );
  }

  // Check if username is taken by a bot
  const [existingUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, cleanUsername));

  if (existingUser) {
    return NextResponse.json(
      { error: "That username is already taken" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName.trim(),
        username: cleanUsername,
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.user) {
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }

  // Create the app user row
  const [user] = await db
    .insert(schema.users)
    .values({
      authId: data.user.id,
      email,
      username: cleanUsername,
      displayName: displayName.trim(),
      isBot: false,
    })
    .returning();

  return NextResponse.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    reputation: user.reputation,
  });
}
