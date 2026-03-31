"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import QuestionCard from "@/components/QuestionCard";

interface Question {
  id: number;
  title: string;
  body: string;
  userId: number;
  viewCount: number;
  score: number;
  createdAt: string;
  userName: string;
  userReputation: number;
  isBot: boolean;
  answerCount: number;
}

function QuestionsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = query
      ? `/api/search?q=${encodeURIComponent(query)}`
      : `/api/questions`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setQuestions(data.questions);
        setLoading(false);
      });
  }, [query]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[27px] text-[#232629] font-normal">
          {query ? `Search Results` : "All Questions"}
        </h1>
        <Link
          href="/questions/new"
          className="h-[38px] px-2.5 bg-[#0a95ff] text-white text-[13px] rounded-[3px] border border-[#0a95ff] hover:bg-[#0074cc] no-underline flex items-center"
        >
          Ask Question
        </Link>
      </div>

      {query && (
        <p className="text-[13px] text-[#6a737c] mb-4">
          Results for <span className="font-semibold text-[#232629]">{query}</span>
        </p>
      )}

      {loading ? (
        <div className="text-center py-12 text-[#838c95]">Searching...</div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 text-[#6a737c] border-t border-[#d6d9dc]">
          {query
            ? `No questions found matching "${query}"`
            : "No questions yet."}
        </div>
      ) : (
        <div className="border-t border-[#d6d9dc]">
          {questions.map((q) => (
            <QuestionCard key={q.id} {...q} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12 text-[#838c95]">Loading...</div>
      }
    >
      <QuestionsContent />
    </Suspense>
  );
}
