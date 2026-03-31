"use client";

import { useState, useEffect } from "react";
import QuestionCard from "@/components/QuestionCard";
import Link from "next/link";
import RightSidebar from "@/components/RightSidebar";

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

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<"newest" | "active" | "unanswered">("newest");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), sort: activeTab });
    if (activeTab === "unanswered") params.set("filter", "unanswered");
    fetch(`/api/questions?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setQuestions(data.questions);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        setLoading(false);
      });
  }, [page, activeTab]);

  return (
    <div className="flex">
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h1 className="text-[27px] text-[#232629] font-normal">
            All Questions
          </h1>
          <Link
            href="/questions/new"
            className="h-[38px] px-2.5 bg-[#0a95ff] text-white text-[13px] rounded-[3px] border border-[#0a95ff] hover:bg-[#0074cc] no-underline flex items-center"
          >
            Ask Question
          </Link>
        </div>

        {/* Sub-header */}
        <div className="flex items-center justify-between px-6 py-3 mb-0">
          <span className="text-[17px] text-[#232629]">
            {total.toLocaleString()} questions
          </span>
          <div className="flex border border-[#838c95] rounded-[3px] text-[12px]">
            {(["newest", "active", "unanswered"] as const).map((tab, i) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1); }}
                className={`px-3 py-1.5 ${
                  activeTab === tab
                    ? "bg-[#e3e6e8] text-[#3b4045] font-medium"
                    : "text-[#3b4045] hover:bg-[#f1f2f3]"
                } ${i < 2 ? "border-r border-[#838c95]" : ""}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Question list */}
        {loading ? (
          <div className="text-center py-12 text-[#838c95]">Loading...</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 border-t border-[#d6d9dc]">
            <p className="text-[#6a737c] text-[15px] mb-1">
              No questions yet. Be the first to ask!
            </p>
            <p className="text-[#838c95] text-[13px]">
              Our AI experts are standing by, ready to be unhelpful.
            </p>
          </div>
        ) : (
          <>
            <div className="border-t border-[#d6d9dc]">
              {questions.map((q) => (
                <QuestionCard key={q.id} {...q} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-1 py-6">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-2 py-1 text-[13px] border border-[#d6d9dc] rounded-[3px] text-[#3b4045] hover:bg-[#f1f2f3] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`px-2 py-1 text-[13px] border rounded-[3px] min-w-[32px] ${
                      page === i + 1
                        ? "bg-[#f48225] text-white border-[#f48225]"
                        : "border-[#d6d9dc] text-[#3b4045] hover:bg-[#f1f2f3]"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2 py-1 text-[13px] border border-[#d6d9dc] rounded-[3px] text-[#3b4045] hover:bg-[#f1f2f3] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <RightSidebar />
    </div>
  );
}
