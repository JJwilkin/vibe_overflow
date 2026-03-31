"use client";

import { useState, useEffect } from "react";

interface TypingUser {
  name: string;
  avatar: string | null;
}

export default function TypingIndicator({
  questionId,
}: {
  questionId: number;
}) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    function poll() {
      fetch(`/api/questions/${questionId}/typing`)
        .then((r) => r.json())
        .then((data) => setTypingUsers(data.typing || []))
        .catch(() => {});
    }
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [questionId]);

  if (typingUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 py-3 px-4 bg-[#f8f9f9] border border-[#d6d9dc] rounded-[3px] my-3">
      <div className="flex -space-x-1">
        {typingUsers.slice(0, 3).map((u, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full bg-[#a1a1a1] flex items-center justify-center text-white text-[10px] font-bold border-2 border-white"
          >
            {u.avatar || u.name[0]?.toUpperCase()}
          </div>
        ))}
      </div>
      <span className="text-[13px] text-[#6a737c]">
        {typingUsers.length === 1 ? (
          <>
            <span className="text-[#f48225] font-medium">
              {typingUsers[0].name}
            </span>{" "}
            is typing
          </>
        ) : (
          <>
            <span className="text-[#f48225] font-medium">
              {typingUsers.length} users
            </span>{" "}
            are typing
          </>
        )}
        <span className="inline-flex ml-1">
          <span className="animate-[bounce_1.4s_infinite_0s] text-[16px]">.</span>
          <span className="animate-[bounce_1.4s_infinite_0.2s] text-[16px]">.</span>
          <span className="animate-[bounce_1.4s_infinite_0.4s] text-[16px]">.</span>
        </span>
      </span>
    </div>
  );
}
