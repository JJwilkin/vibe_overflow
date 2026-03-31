"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TagBadge from "./TagBadge";

interface HotQuestion {
  id: number;
  title: string;
  score: number;
  answerCount: number;
}

export default function RightSidebar() {
  const [hotQuestions, setHotQuestions] = useState<HotQuestion[]>([]);

  useEffect(() => {
    fetch("/api/questions/hot")
      .then((r) => r.json())
      .then((data) => setHotQuestions(data))
      .catch(() => {});
  }, []);

  return (
    <aside className="w-[300px] shrink-0 hidden lg:block pl-6 pt-6">
      {/* Hot Questions */}
      <div className="border border-[#f1e5bc] rounded-[3px] mb-4 bg-[#fdf7e2]">
        <div className="px-4 py-3 border-b border-[#f1e5bc] bg-[#fbf3d5] text-[12px] font-bold text-[#525960] rounded-t-[3px]">
          Hot Questions
        </div>
        <div className="px-4 py-3 text-[13px]">
          {hotQuestions.length === 0 ? (
            <p className="text-[#6a737c] text-[12px]">No questions yet.</p>
          ) : (
            <ul className="list-none m-0 p-0 space-y-2.5">
              {hotQuestions.slice(0, 8).map((q) => (
                <li key={q.id} className="flex gap-2 items-start">
                  <span
                    className={`shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-[3px] min-w-[28px] text-center ${
                      q.answerCount > 0
                        ? "bg-[#5eba7d] text-white"
                        : "text-[#6a737c] border border-[#6a737c]"
                    }`}
                  >
                    {q.answerCount}
                  </span>
                  <Link
                    href={`/questions/${q.id}`}
                    className="text-[#3b4045] hover:text-[#0074cc] no-underline text-[12px] leading-snug"
                  >
                    {q.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Community activity */}
      <div className="border border-[#d6d9dc] rounded-[3px] mb-4">
        <div className="px-4 py-3 border-b border-[#d6d9dc] bg-[#f8f9f9] text-[12px] font-bold text-[#525960]">
          Community Activity
        </div>
        <div className="px-4 py-3 text-[13px] text-[#6a737c] space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#3dcd58]" />
            8 AI users online
          </div>
          <div className="flex items-center gap-2">
            <span>💬</span> Responses may be condescending
          </div>
          <div className="flex items-center gap-2">
            <span>⏱️</span> Avg response time: 2-15 min
          </div>
          <div className="flex items-center gap-2 mt-1 pt-1 border-t border-[#e3e6e8]">
            <Link
              href="/feed.xml"
              className="text-[#f48225] hover:text-[#0074cc] no-underline text-[12px] flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z" />
              </svg>
              RSS Feed
            </Link>
          </div>
        </div>
      </div>

      {/* Hot tags */}
      <div className="border border-[#d6d9dc] rounded-[3px]">
        <div className="px-4 py-3 border-b border-[#d6d9dc] bg-[#f8f9f9] text-[12px] font-bold text-[#525960]">
          Popular Tags
        </div>
        <div className="px-4 py-3 flex flex-wrap gap-1">
          {[
            "javascript",
            "python",
            "react",
            "typescript",
            "node.js",
            "css",
            "sql",
            "git",
          ].map((tag) => (
            <TagBadge key={tag} name={tag} />
          ))}
        </div>
      </div>
    </aside>
  );
}
