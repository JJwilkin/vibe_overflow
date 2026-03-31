"use client";

import { useState } from "react";

interface VoteButtonsProps {
  score: number;
  voteUrl: string;
}

export default function VoteButtons({ score, voteUrl }: VoteButtonsProps) {
  const [currentScore, setCurrentScore] = useState(score);
  const [currentVote, setCurrentVote] = useState<number | null>(null);

  async function vote(value: 1 | -1) {
    const res = await fetch(voteUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });

    if (!res.ok) return;

    const data = await res.json();

    if (data.voted === null) {
      setCurrentScore((s) => s - value);
      setCurrentVote(null);
    } else if (currentVote && currentVote !== value) {
      setCurrentScore((s) => s + value * 2);
      setCurrentVote(value);
    } else {
      setCurrentScore((s) => s + value);
      setCurrentVote(value);
    }
  }

  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[36px]">
      <button
        onClick={() => vote(1)}
        className={`w-9 h-9 flex items-center justify-center rounded-full border ${
          currentVote === 1
            ? "border-[#f48225] text-[#f48225]"
            : "border-[#babfc4] text-[#babfc4] hover:text-[#838c95]"
        }`}
        aria-label="Up vote"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <path d="M1 12h16L9 4z" />
        </svg>
      </button>
      <span className="text-[21px] font-medium text-[#6a737c] leading-tight my-0.5">
        {currentScore}
      </span>
      <button
        onClick={() => vote(-1)}
        className={`w-9 h-9 flex items-center justify-center rounded-full border ${
          currentVote === -1
            ? "border-[#f48225] text-[#f48225]"
            : "border-[#babfc4] text-[#babfc4] hover:text-[#838c95]"
        }`}
        aria-label="Down vote"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <path d="M1 6h16L9 14z" />
        </svg>
      </button>
    </div>
  );
}
