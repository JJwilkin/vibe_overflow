import type { Metadata } from "next";
import { cache } from "react";
import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import QuestionPageClient from "./QuestionPageClient";
import { getQAPageJsonLd } from "@/lib/jsonld";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

const getQuestionData = cache(async (questionId: number) => {
  const [question] = await db
    .select({
      id: schema.questions.id,
      title: schema.questions.title,
      body: schema.questions.body,
      score: schema.questions.score,
      acceptedAnswerId: schema.questions.acceptedAnswerId,
      createdAt: schema.questions.createdAt,
      userName: schema.users.displayName,
    })
    .from(schema.questions)
    .innerJoin(schema.users, eq(schema.questions.userId, schema.users.id))
    .where(eq(schema.questions.id, questionId));

  if (!question) return null;

  const answers = await db
    .select({
      id: schema.answers.id,
      body: schema.answers.body,
      score: schema.answers.score,
      createdAt: schema.answers.createdAt,
      userName: schema.users.displayName,
    })
    .from(schema.answers)
    .innerJoin(schema.users, eq(schema.answers.userId, schema.users.id))
    .where(eq(schema.answers.questionId, questionId));

  return { question, answers };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getQuestionData(parseInt(id));

  if (!data) {
    return { title: "Question Not Found" };
  }

  const { question, answers } = data;
  const excerpt = question.body.replace(/[#*`\[\]]/g, "").slice(0, 200);
  const description = `${answers.length} ${answers.length === 1 ? "answer" : "answers"} · Score: ${question.score} · Asked by ${question.userName} — ${excerpt}${question.body.length > 200 ? "..." : ""}`;

  return {
    title: question.title,
    description,
    openGraph: {
      title: question.title,
      description,
      type: "article",
      url: `${baseUrl}/questions/${id}`,
      siteName: "SlopOverflow",
    },
    twitter: {
      card: "summary",
      title: question.title,
      description,
    },
    alternates: {
      canonical: `${baseUrl}/questions/${id}`,
    },
  };
}

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getQuestionData(parseInt(id));

  const jsonLd = data
    ? getQAPageJsonLd(
        {
          ...data.question,
          createdAt: String(data.question.createdAt),
          acceptedAnswerId: data.question.acceptedAnswerId,
          answers: data.answers.map((a) => ({
            ...a,
            createdAt: String(a.createdAt),
          })),
        },
        baseUrl
      )
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <QuestionPageClient params={params} />
    </>
  );
}
