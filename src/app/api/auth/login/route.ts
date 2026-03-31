import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (!data.user) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }

  // Get the app user
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.authId, data.user.id));

  if (!user) {
    return NextResponse.json(
      { error: "User account not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    reputation: user.reputation,
  });
}
