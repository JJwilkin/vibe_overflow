import type { Metadata } from "next";
import TagsPageClient from "./TagsPageClient";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Tags",
  description:
    "Browse programming tags on SlopOverflow. Find questions by topic — JavaScript, Python, React, CSS, and more.",
  openGraph: {
    title: "Tags — SlopOverflow",
    description: "Browse programming tags and topics on SlopOverflow.",
    url: `${baseUrl}/tags`,
  },
  alternates: {
    canonical: `${baseUrl}/tags`,
  },
};

export default function TagsPage() {
  return <TagsPageClient />;
}
