"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "./AuthContext";
import CommentTypingIndicator from "./CommentTypingIndicator";

interface Comment {
  id: number;
  body: string;
  userId: number;
  score: number;
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

interface MentionUser {
  id: number;
  username: string;
  displayName: string;
  isBot: boolean;
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

function renderCommentBody(body: string) {
  const parts = body.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span key={i} className="text-[#0074cc] font-medium">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function CommentVoteButtons({
  commentId,
  score,
  isLoggedIn,
}: {
  commentId: number;
  score: number;
  isLoggedIn: boolean;
}) {
  const { requireAuth } = useAuth();
  const [currentScore, setCurrentScore] = useState(score);
  const [voting, setVoting] = useState(false);

  async function handleVote(value: 1 | -1) {
    if (!isLoggedIn && !requireAuth()) return;
    if (voting) return;
    setVoting(true);
    const res = await fetch(`/api/comments/${commentId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (res.ok) {
      const data = await res.json();
      setCurrentScore(data.score);
    }
    setVoting(false);
  }

  return (
    <span className="inline-flex items-center gap-0.5 mr-1.5">
      <button
        onClick={() => handleVote(1)}
        className="text-[#babfc4] hover:text-[#f48225] text-[11px] leading-none p-0"
        title="Upvote comment"
      >
        ▲
      </button>
      {currentScore !== 0 && (
        <span className="text-[#838c95] text-[11px] font-medium min-w-[8px] text-center">
          {currentScore}
        </span>
      )}
      <button
        onClick={() => handleVote(-1)}
        className="text-[#babfc4] hover:text-[#f48225] text-[11px] leading-none p-0"
        title="Downvote comment"
      >
        ▼
      </button>
    </span>
  );
}

function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  placeholder: string;
}) {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []));
  }, []);

  function handleChange(newVal: string) {
    onChange(newVal);

    // Check if cursor is right after an @mention being typed
    const cursorPos = inputRef.current?.selectionStart || newVal.length;
    const textBeforeCursor = newVal.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      const filtered = users
        .filter(
          (u) =>
            u.username.toLowerCase().includes(query) ||
            u.displayName.toLowerCase().includes(query)
        )
        .slice(0, 6);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIdx(0);
    } else {
      setShowSuggestions(false);
    }
  }

  function insertMention(username: string) {
    const cursorPos = inputRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const before = textBeforeCursor.slice(0, mentionMatch.index);
      const after = value.slice(cursorPos);
      const newVal = `${before}@${username} ${after}`;
      onChange(newVal);
    }
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (suggestions[selectedIdx]) {
          e.preventDefault();
          insertMention(suggestions[selectedIdx].username);
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder={placeholder}
        className="w-full h-[30px] px-2 border border-[#babfc4] rounded-[3px] text-[13px] focus:outline-none focus:border-[#6bbbf7] focus:shadow-[0_0_0_4px_rgba(107,187,247,0.15)]"
        autoFocus
      />
      {showSuggestions && (
        <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-[#d6d9dc] rounded-[4px] shadow-lg z-50 max-h-48 overflow-y-auto">
          {suggestions.map((user, idx) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(user.username);
              }}
              className={`w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2 ${
                idx === selectedIdx ? "bg-[#e1ecf4]" : "hover:bg-[#f1f2f3]"
              }`}
            >
              <span className={user.isBot ? "text-[#f48225]" : "text-[#0074cc]"}>
                @{user.username}
              </span>
              <span className="text-[#6a737c] text-[12px]">{user.displayName}</span>
              {user.isBot && (
                <span className="text-[9px] px-1 py-[1px] bg-[#f48225] text-white rounded-[2px] font-medium ml-auto">
                  BOT
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentSection({
  comments,
  questionId,
  answerId,
  isLoggedIn,
  onCommentAdded,
}: CommentSectionProps) {
  const { requireAuth } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!body.trim() || submitting) return;

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
          className="py-1.5 border-b border-[#e3e6e8] text-[13px] leading-[1.4] flex items-start gap-0"
        >
          <CommentVoteButtons
            commentId={comment.id}
            score={comment.score}
            isLoggedIn={isLoggedIn}
          />
          <span className="flex-1">
            <span className="text-[#232629]">{renderCommentBody(comment.body)}</span>
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
          </span>
        </div>
      ))}

      {questionId && (
        <CommentTypingIndicator questionId={questionId} answerId={answerId} />
      )}

      {!showForm && (
        <button
          onClick={() => {
            if (isLoggedIn || requireAuth()) {
              setShowForm(true);
            }
          }}
          className="text-[13px] text-[#838c95] hover:text-[#0074cc] py-1.5"
        >
          Add a comment
        </button>
      )}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex gap-2 py-2"
        >
          <MentionInput
            value={body}
            onChange={setBody}
            onSubmit={handleSubmit}
            placeholder="Use comments to ask for more information. Use @username to mention someone."
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
