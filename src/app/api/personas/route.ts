import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/session";
import crypto from "crypto";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const personas = await db
    .select()
    .from(schema.customPersonas)
    .where(eq(schema.customPersonas.createdBy, user.id));

  return NextResponse.json(personas);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await request.json();
  const {
    displayName,
    avatar,
    bio,
    aboutMe,
    systemPrompt,
    votePattern,
    replyProbability,
    responseDelay,
    projectPreferences,
    questionInterval,
  } = body;

  // Validation
  if (!displayName || !avatar || !bio || !systemPrompt) {
    return NextResponse.json(
      { error: "Display name, avatar, bio, and system prompt are required" },
      { status: 400 }
    );
  }

  if (displayName.length > 30) {
    return NextResponse.json(
      { error: "Display name must be 30 characters or less" },
      { status: 400 }
    );
  }

  if (systemPrompt.length > 2000) {
    return NextResponse.json(
      { error: "System prompt must be 2000 characters or less" },
      { status: 400 }
    );
  }

  const validVotePatterns = ["mostly_downvotes", "mostly_upvotes", "mixed", "never_votes"];
  if (votePattern && !validVotePatterns.includes(votePattern)) {
    return NextResponse.json(
      { error: "Invalid vote pattern" },
      { status: 400 }
    );
  }

  // Enforce max 3 custom personas per user
  const existing = await db
    .select({ id: schema.customPersonas.id })
    .from(schema.customPersonas)
    .where(eq(schema.customPersonas.createdBy, user.id));

  if (existing.length >= 3) {
    return NextResponse.json(
      { error: "You can create a maximum of 3 custom bots" },
      { status: 400 }
    );
  }

  const personaId = `custom_${crypto.randomUUID().slice(0, 8)}`;

  // Generate unique username from display name
  const baseUsername = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 25);

  let username = baseUsername || "bot";
  const [existingUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username));

  if (existingUser) {
    username = `${baseUsername}_${Math.floor(Math.random() * 9999)}`;
  }

  // Parse array/object fields with defaults
  const parsedDelay = Array.isArray(responseDelay) ? responseDelay : [120, 480];
  const parsedPrefs = projectPreferences && typeof projectPreferences === "object"
    ? projectPreferences
    : { domains: [], techAffinities: [] };
  const parsedInterval = Array.isArray(questionInterval) ? questionInterval : [2, 4];
  const parsedProbability = typeof replyProbability === "number"
    ? Math.max(10, Math.min(90, replyProbability))
    : 50;

  // Insert custom persona
  const [persona] = await db
    .insert(schema.customPersonas)
    .values({
      personaId,
      createdBy: user.id,
      displayName: displayName.trim(),
      avatar,
      bio: bio.trim(),
      aboutMe: (aboutMe || "").trim(),
      systemPrompt: systemPrompt.trim(),
      responseDelay: JSON.stringify(parsedDelay),
      replyProbability: parsedProbability,
      votePattern: votePattern || "mixed",
      projectPreferences: JSON.stringify(parsedPrefs),
      questionInterval: JSON.stringify(parsedInterval),
    })
    .returning();

  // Create corresponding bot user
  const [botUser] = await db
    .insert(schema.users)
    .values({
      username,
      displayName: displayName.trim(),
      bio: bio.trim(),
      avatarUrl: avatar,
      isBot: true,
      personaId,
    })
    .returning();

  return NextResponse.json(
    {
      persona,
      botUser: {
        id: botUser.id,
        username: botUser.username,
        displayName: botUser.displayName,
      },
    },
    { status: 201 }
  );
}
