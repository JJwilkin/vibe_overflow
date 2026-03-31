"use client";

import Link from "next/link";
import VoteButtons from "./VoteButtons";
import MarkdownRenderer from "./MarkdownRenderer";
import CommentSection from "./CommentSection";
import ShareAnswerButton from "./ShareAnswerButton";

interface AnswerComment {
  id: number;
  body: string;
  userId: number;
  score: number;
  userName: string;
  isBot: boolean;
  createdAt: string;
}

interface AnswerCardProps {
  id: number;
  body: string;
  score: number;
  isAccepted: boolean;
  userId: number;
  userName: string;
  userReputation: number;
  userAvatar: string | null;
  isBot: boolean;
  personaId: string | null;
  createdAt: string;
  comments?: AnswerComment[];
  isLoggedIn?: boolean;
  isQuestionAuthor?: boolean;
  questionId?: number;
  onCommentAdded?: () => void;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

export default function AnswerCard({
  id,
  body,
  userId,
  score,
  isAccepted,
  userName,
  userReputation,
  userAvatar,
  isBot,
  createdAt,
  comments = [],
  isLoggedIn = false,
  isQuestionAuthor = false,
  questionId,
  onCommentAdded,
}: AnswerCardProps) {
  async function handleAccept() {
    if (!questionId) return;
    await fetch(`/api/questions/${questionId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerId: id }),
    });
    onCommentAdded?.();
  }

  return (
    <div id={`answer-${id}`} className="flex gap-4 py-4 border-b border-[#d6d9dc]">
      <div className="flex flex-col items-center gap-1">
        <VoteButtons score={score} voteUrl={`/api/answers/${id}/vote`} />
        {isQuestionAuthor ? (
          <button
            onClick={handleAccept}
            className={`w-9 h-9 flex items-center justify-center ${
              isAccepted ? "text-[#2f6f44]" : "text-[#babfc4] hover:text-[#2f6f44]"
            }`}
            title={isAccepted ? "Unaccept this answer" : "Accept this answer"}
          >
            <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 36 36">
              <path d="M6 14l8 8L30 6l-2-2-14 14-6-6z" />
            </svg>
          </button>
        ) : isAccepted ? (
          <svg
            className="w-9 h-9 text-[#2f6f44]"
            fill="currentColor"
            viewBox="0 0 36 36"
            aria-label="Accepted answer"
          >
            <path d="M6 14l8 8L30 6l-2-2-14 14-6-6z" />
          </svg>
        ) : null}
      </div>

      <div className="flex-1 min-w-0">
        <MarkdownRenderer content={body} />

        <div className="flex items-center justify-end mt-4 pt-4">
          <div className="bg-[#d9eaf7] rounded-[3px] px-2 py-1.5">
            <div className="text-[12px] text-[#6a737c] mb-1">
              answered {timeAgo(createdAt)}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[3px] bg-[#a1a1a1] flex items-center justify-center text-white text-[12px] font-bold">
                {userAvatar || userName[0]?.toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/users/${userId}`}
                    className={`text-[13px] no-underline ${
                      isBot ? "text-[#f48225]" : "text-[#0074cc]"
                    } hover:text-[#0a95ff]`}
                  >
                    {userName}
                  </Link>
                  {isBot && (
                    <span className="text-[10px] px-1 py-[1px] bg-[#f48225] text-white rounded-[2px] font-medium">
                      BOT
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-[#6a737c] font-bold">
                  {userReputation.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 pt-2">
          <ShareAnswerButton
            answerId={id}
            questionId={questionId || 0}
            userName={userName}
            userReputation={userReputation}
            isBot={isBot}
            body={body}
          />
        </div>

        <CommentSection
          comments={comments}
          questionId={questionId}
          answerId={id}
          isLoggedIn={isLoggedIn}
          onCommentAdded={onCommentAdded || (() => {})}
        />
      </div>
    </div>
  );
}
