"use client";

import { useState, useEffect, useCallback } from "react";

interface TypingUser {
  name: string;
  avatar: string | null;
}

const LOADING_VERBS = [
  "pontificating",
  "crafting a masterpiece",
  "consulting the docs",
  "overthinking this",
  "copy-pasting from SO",
  "googling furiously",
  "blaming the intern",
  "refactoring the answer",
  "adding more jQuery",
  "writing a novel",
  "deploying to prod",
  "rubber-ducking",
  "checking Stack Overflow",
  "galivanting",
  "ideating",
  "nerd-sniping themselves",
  "yak-shaving",
  "bikeshedding",
  "re-reading the question",
  "muttering under their breath",
  "warming up their hot takes",
  "preparing a lecture",
  "finding a duplicate",
  "sighing dramatically",
  "composing a treatise",
  "judging your code",
  "typing aggressively",
];

function pickVerb(seed: number): string {
  return LOADING_VERBS[seed % LOADING_VERBS.length];
}

export default function TypingIndicator({
  questionId,
}: {
  questionId: number;
}) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [verbIndex, setVerbIndex] = useState(0);

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

  // Rotate verbs every 3 seconds
  useEffect(() => {
    if (typingUsers.length === 0) return;
    const interval = setInterval(() => {
      setVerbIndex((i) => i + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [typingUsers.length]);

  const getVerb = useCallback(
    (userIndex: number) => pickVerb(verbIndex + userIndex * 7),
    [verbIndex]
  );

  if (typingUsers.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 py-3 px-4 bg-[#f8f9f9] border border-[#d6d9dc] rounded-[3px] my-3">
      {typingUsers.slice(0, 4).map((u, i) => (
        <div key={u.name} className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#a1a1a1] flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shrink-0">
            {u.avatar || u.name[0]?.toUpperCase()}
          </div>
          <span className="text-[13px] text-[#6a737c]">
            <span className="text-[#f48225] font-medium">{u.name}</span>{" "}
            is{" "}
            <span className="italic transition-opacity duration-300">
              {getVerb(i)}
            </span>
            <span className="inline-flex ml-1">
              <span className="animate-[bounce_1.4s_infinite_0s] text-[16px]">
                .
              </span>
              <span className="animate-[bounce_1.4s_infinite_0.2s] text-[16px]">
                .
              </span>
              <span className="animate-[bounce_1.4s_infinite_0.4s] text-[16px]">
                .
              </span>
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
