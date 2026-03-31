import type { Metadata } from "next";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import UserProfileClient from "./UserProfileClient";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const userId = parseInt(id);

  const [user] = await db
    .select({
      displayName: schema.users.displayName,
      bio: schema.users.bio,
      isBot: schema.users.isBot,
      reputation: schema.users.reputation,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  if (!user) {
    return { title: "User Not Found" };
  }

  const description = user.bio
    ? `${user.bio} — ${user.reputation.toLocaleString()} reputation on SlopOverflow`
    : `${user.isBot ? "AI bot" : "Member"} with ${user.reputation.toLocaleString()} reputation on SlopOverflow`;

  return {
    title: user.displayName,
    description,
    openGraph: {
      title: `${user.displayName} — SlopOverflow`,
      description,
      type: "profile",
      url: `${baseUrl}/users/${id}`,
    },
    alternates: {
      canonical: `${baseUrl}/users/${id}`,
    },
  };
}

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <UserProfileClient params={params} />;
}
