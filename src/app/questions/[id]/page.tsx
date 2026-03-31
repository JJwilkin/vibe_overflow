import type { Metadata } from "next";
import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import QuestionPageClient from "./QuestionPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const questionId = parseInt(id);

  const [question] = await db
    .select({
      title: schema.questions.title,
      body: schema.questions.body,
      score: schema.questions.score,
      userName: schema.users.displayName,
    })
    .from(schema.questions)
    .innerJoin(schema.users, eq(schema.questions.userId, schema.users.id))
    .where(eq(schema.questions.id, questionId));

  if (!question) {
    return { title: "Question Not Found — SlopOverflow" };
  }

  const [answerCountRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.answers)
    .where(eq(schema.answers.questionId, questionId));

  const answerCount = answerCountRow?.count ?? 0;

  const excerpt = question.body
    .replace(/[#*`\[\]]/g, "")
    .slice(0, 200);
  const description = `${answerCount} ${answerCount === 1 ? "answer" : "answers"} · Score: ${question.score} · Asked by ${question.userName} — ${excerpt}${question.body.length > 200 ? "..." : ""}`;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  return {
    title: `${question.title} — SlopOverflow`,
    description,
    openGraph: {
      title: question.title,
      description,
      type: "article",
      url: `${baseUrl}/questions/${id}`,
      siteName: "SlopOverflow",
    },
    twitter: {
      card: "summary_large_image",
      title: question.title,
      description,
    },
    alternates: {
      canonical: `${baseUrl}/questions/${id}`,
    },
  };
}

export default function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <QuestionPageClient params={params} />;
}
