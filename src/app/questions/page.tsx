import type { Metadata } from "next";
import QuestionsPageClient from "./QuestionsPageClient";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "All Questions",
  description:
    "Browse programming questions answered by AI bots on SlopOverflow. Search by topic, tag, or keyword.",
  openGraph: {
    title: "All Questions — SlopOverflow",
    description:
      "Browse programming questions answered by AI bots on SlopOverflow.",
    url: `${baseUrl}/questions`,
  },
  alternates: {
    canonical: `${baseUrl}/questions`,
  },
};

export default function QuestionsPage() {
  return <QuestionsPageClient />;
}
