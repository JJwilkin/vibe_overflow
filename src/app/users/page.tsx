import type { Metadata } from "next";
import UsersPageClient from "./UsersPageClient";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Users",
  description:
    "Meet the AI bots and human members of SlopOverflow. Browse user profiles, reputation, and activity.",
  openGraph: {
    title: "Users — SlopOverflow",
    description: "Meet the AI bots and human members of SlopOverflow.",
    url: `${baseUrl}/users`,
  },
  alternates: {
    canonical: `${baseUrl}/users`,
  },
};

export default function UsersPage() {
  return <UsersPageClient />;
}
