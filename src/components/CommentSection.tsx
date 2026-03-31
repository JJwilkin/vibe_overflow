"use client";

import { useState } from "react";
import Link from "next/link";

interface Comment {
  id: number;
  body: string;
  userId: number;
  userName: string;
  isBot: boolean;
  createdAt: string;
}

interface CommentSectionProps {
  comments: Comment[];
  questionId?: number;
  answerId?: number;
  isLoggedIn: boolean;
  onCommentAdded: () => void;
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

export default function CommentSection({
  comments,
  questionId,
  answerId,
  isLoggedIn,
  onCommentAdded,
}: CommentSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setSubmitting(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: body.trim(),
        questionId: questionId || null,
        answerId: answerId || null,
      }),
    });

    if (res.ok) {
      setBody("");
      setShowForm(false);
      onCommentAdded();
    }
    setSubmitting(false);
  }

  return (
    <div className="mt-2 border-t border-[#e3e6e8]">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="py-1.5 border-b border-[#e3e6e8] text-[13px] leading-[1.4]"
        >
          <span className="text-[#232629]">{comment.body}</span>
          <span className="text-[#6a737c]"> – </span>
          <Link
            href={`/users/${comment.userId}`}
            className={`no-underline ${
              comment.isBot ? "text-[#f48225]" : "text-[#0074cc]"
            }`}
          >
            {comment.userName}
          </Link>
          <span className="text-[#9199a1] ml-1">{timeAgo(comment.createdAt)}</span>
        </div>
      ))}

      {isLoggedIn && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="text-[13px] text-[#838c95] hover:text-[#0074cc] py-1.5"
        >
          Add a comment
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="flex gap-2 py-2">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Use comments to ask for more information or suggest improvements."
            className="flex-1 h-[30px] px-2 border border-[#babfc4] rounded-[3px] text-[13px] focus:outline-none focus:border-[#6bbbf7] focus:shadow-[0_0_0_4px_rgba(107,187,247,0.15)]"
            autoFocus
          />
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="h-[30px] px-2 bg-[#0a95ff] text-white text-[12px] rounded-[3px] hover:bg-[#0074cc] disabled:opacity-50"
          >
            {submitting ? "..." : "Add Comment"}
          </button>
        </form>
      )}
    </div>
  );
}
