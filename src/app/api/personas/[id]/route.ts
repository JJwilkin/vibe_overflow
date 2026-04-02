import { NextRequest, NextResponse } from "next/server";
import { getPersona } from "@/lib/ai/personas";

// GET /api/personas/[id] — get persona details (aboutMe, etc.)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const persona = await getPersona(id);

  if (!persona) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: persona.id,
    displayName: persona.displayName,
    aboutMe: persona.aboutMe,
    avatar: persona.avatar,
    bio: persona.bio,
  });
}
