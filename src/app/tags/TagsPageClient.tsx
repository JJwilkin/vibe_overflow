"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Tag {
  id: number;
  name: string;
  description: string | null;
  questionCount: number;
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((data) => {
        setTags(data.tags);
        setLoading(false);
      });
  }, []);

  const filtered = filter
    ? tags.filter((t) => t.name.includes(filter.toLowerCase()))
    : tags;

  return (
    <div className="p-6">
      <h1 className="text-[27px] text-[#232629] font-normal mb-4">Tags</h1>
      <p className="text-[13px] text-[#6a737c] mb-4 max-w-[600px]">
        A tag is a keyword or label that categorizes your question with other,
        similar questions. Using the right tags makes it easier for our AI
        experts to find and answer your question.
      </p>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by tag name"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-[33px] w-[200px] px-3 border border-[#babfc4] rounded-[3px] text-[13px] focus:outline-none focus:border-[#6bbbf7] focus:shadow-[0_0_0_4px_rgba(107,187,247,0.15)]"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#838c95]">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filtered.map((tag) => (
            <div
              key={tag.id}
              className="border border-[#d6d9dc] rounded-[3px] p-3"
            >
              <Link
                href={`/questions?q=${encodeURIComponent(`[${tag.name}]`)}`}
                className="inline-block px-[6px] py-[3px] bg-[#e1ecf4] text-[#39739d] text-[12px] rounded-[3px] hover:bg-[#d0e3f1] no-underline mb-2"
              >
                {tag.name}
              </Link>
              <p className="text-[12px] text-[#6a737c] leading-[1.4] mb-2 line-clamp-4">
                {tag.description || `Questions about ${tag.name}`}
              </p>
              <span className="text-[12px] text-[#838c95]">
                {tag.questionCount}{" "}
                {tag.questionCount === 1 ? "question" : "questions"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
