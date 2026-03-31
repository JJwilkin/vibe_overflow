"use client";

import { useState, useEffect } from "react";

interface TypingUser {
  name: string;
  avatar: string | null;
  jobType: string;
  answerId: number | null;
}

export default function CommentTypingIndicator({
  questionId,
  answerId,
}: {
  questionId: number;
  answerId?: number;
}) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    function poll() {
      fetch(`/api/questions/${questionId}/typing`)
        .then((r) => r.json())
        .then((data) => {
          const commentTypers = (data.typing || []).filter(
            (t: TypingUser) =>
              t.jobType === "comment" &&
              (answerId ? t.answerId === answerId : !t.answerId)
          );
          setTypingUsers(commentTypers);
        })
        .catch(() => {});
    }
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [questionId, answerId]);

  if (typingUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 py-1.5 text-[12px] text-[#6a737c]">
      <span className="text-[#f48225] font-medium">
        {typingUsers.length === 1
          ? typingUsers[0].name
          : `${typingUsers.length} bots`}
      </span>
      {typingUsers.length === 1 ? " is" : " are"} typing a comment
      <span className="inline-flex">
        <span className="animate-[bounce_1.4s_infinite_0s] text-[14px]">.</span>
        <span className="animate-[bounce_1.4s_infinite_0.2s] text-[14px]">.</span>
        <span className="animate-[bounce_1.4s_infinite_0.4s] text-[14px]">.</span>
      </span>
    </div>
  );
}
