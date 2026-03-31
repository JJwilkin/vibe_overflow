"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: number;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  isBot: boolean;
  personaId: string | null;
  reputation: number;
  createdAt: string;
}

interface UserQuestion {
  id: number;
  title: string;
  score: number;
  answerCount: number;
  createdAt: string;
}

interface UserAnswer {
  id: number;
  body: string;
  score: number;
  questionId: number;
  questionTitle: string;
  createdAt: string;
}

function formatRepReason(reason: string): string {
  const map: Record<string, string> = {
    answer_upvoted: "Answer was upvoted",
    answer_downvoted: "Answer was downvoted",
    question_upvoted: "Question was upvoted",
    question_downvoted: "Question was downvoted",
    answer_accepted: "Answer was accepted",
    accepted_answer: "Accepted an answer",
  };
  return map[reason] || reason;
}

function memberDuration(dateStr: string): string {
  const days = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"}`;
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? "year" : "years"}`;
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

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [questions, setQuestions] = useState<UserQuestion[]>([]);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [stats, setStats] = useState({ questionCount: 0, answerCount: 0, votesGiven: 0, commentsCount: 0 });
  const [repHistory, setRepHistory] = useState<Array<{ id: number; amount: number; reason: string; questionId: number | null; createdAt: string }>>([]);
  const [aboutMe, setAboutMe] = useState<string | null>(null);
  const [badges, setBadges] = useState<Array<{ id: string; name: string; description: string; tier: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"answers" | "questions" | "reputation">("answers");

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setUser(data.user);
        setQuestions(data.questions);
        setAnswers(data.answers);
        setStats(data.stats);
        setRepHistory(data.repHistory || []);
        setBadges(data.badges || []);
        setLoading(false);
        // Fetch persona aboutMe for bots
        if (data.user.personaId) {
          fetch(`/api/personas/${data.user.personaId}`)
            .then((r) => r.json())
            .then((p) => setAboutMe(p.aboutMe || null))
            .catch(() => {});
        }
      })
      .catch(() => {
        router.push("/users");
      });
  }, [id, router]);

  if (loading || !user) {
    return (
      <div className="p-6 text-center text-[#838c95]">Loading...</div>
    );
  }

  return (
    <div className="p-6">
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-[128px] h-[128px] rounded-[6px] bg-[#a1a1a1] flex items-center justify-center text-white text-5xl font-bold shrink-0">
          {user.avatarUrl || user.displayName[0]?.toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-[34px] text-[#232629] font-normal leading-tight">
              {user.displayName}
            </h1>
            {user.isBot && (
              <span className="text-[12px] px-1.5 py-[2px] bg-[#f48225] text-white rounded-[3px] font-medium">
                BOT
              </span>
            )}
          </div>
          {user.bio && (
            <p className="text-[13px] text-[#6a737c] mb-2">{user.bio}</p>
          )}
          {badges.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {badges.map((badge) => (
                <span
                  key={badge.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    badge.tier === "gold"
                      ? "bg-[#fff4d1] text-[#8a6d3b] border border-[#e7c157]"
                      : badge.tier === "silver"
                      ? "bg-[#e8e8e8] text-[#6a737c] border border-[#babfc4]"
                      : "bg-[#f0deca] text-[#7c5a3c] border border-[#d1a77a]"
                  }`}
                  title={badge.description}
                >
                  <span>
                    {badge.tier === "gold" ? "🥇" : badge.tier === "silver" ? "🥈" : "🥉"}
                  </span>
                  {badge.name}
                </span>
              ))}
            </div>
          )}
          {aboutMe && (
            <div className="mt-3 mb-3 p-3 bg-[#f8f9f9] border border-[#d6d9dc] rounded-[3px]">
              <h3 className="text-[12px] font-bold text-[#6a737c] mb-1 uppercase tracking-wide">About me</h3>
              <p className="text-[13px] text-[#3b4045] leading-[1.5]">{aboutMe}</p>
            </div>
          )}
          <div className="flex items-center gap-4 text-[13px] text-[#6a737c] flex-wrap">
            <span>
              🏆 <strong className="text-[#232629]">{user.reputation.toLocaleString()}</strong> reputation
            </span>
            <span>
              📝 <strong>{stats.questionCount}</strong> questions
            </span>
            <span>
              💬 <strong>{stats.answerCount}</strong> answers
            </span>
            <span>
              🗳️ <strong>{stats.votesGiven}</strong> votes cast
            </span>
            <span>
              💭 <strong>{stats.commentsCount}</strong> comments
            </span>
            <span>
              📅 member for {memberDuration(user.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#d6d9dc] mb-4">
        <button
          onClick={() => setTab("answers")}
          className={`px-4 py-2 text-[13px] border-b-2 -mb-px ${
            tab === "answers"
              ? "border-[#f48225] text-[#232629] font-medium"
              : "border-transparent text-[#6a737c] hover:text-[#232629]"
          }`}
        >
          Answers ({stats.answerCount})
        </button>
        <button
          onClick={() => setTab("questions")}
          className={`px-4 py-2 text-[13px] border-b-2 -mb-px ${
            tab === "questions"
              ? "border-[#f48225] text-[#232629] font-medium"
              : "border-transparent text-[#6a737c] hover:text-[#232629]"
          }`}
        >
          Questions ({stats.questionCount})
        </button>
        <button
          onClick={() => setTab("reputation")}
          className={`px-4 py-2 text-[13px] border-b-2 -mb-px ${
            tab === "reputation"
              ? "border-[#f48225] text-[#232629] font-medium"
              : "border-transparent text-[#6a737c] hover:text-[#232629]"
          }`}
        >
          Reputation
        </button>
      </div>

      {/* Tab content */}
      {tab === "reputation" ? (
        repHistory.length === 0 ? (
          <p className="text-[13px] text-[#6a737c] py-4">
            No reputation changes yet.
          </p>
        ) : (
          <div className="space-y-0">
            {repHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 py-2 border-b border-[#e3e6e8]"
              >
                <span
                  className={`text-[13px] min-w-[50px] text-right font-bold ${
                    entry.amount > 0 ? "text-[#2f6f44]" : "text-[#de4f54]"
                  }`}
                >
                  {entry.amount > 0 ? "+" : ""}
                  {entry.amount}
                </span>
                <span className="text-[13px] text-[#6a737c]">
                  {formatRepReason(entry.reason)}
                </span>
                {entry.questionId && (
                  <Link
                    href={`/questions/${entry.questionId}`}
                    className="text-[#0074cc] text-[13px] no-underline hover:text-[#0a95ff] truncate flex-1"
                  >
                    View question
                  </Link>
                )}
                <span className="text-[12px] text-[#838c95] shrink-0">
                  {timeAgo(entry.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )
      ) : tab === "answers" ? (
        answers.length === 0 ? (
          <p className="text-[13px] text-[#6a737c] py-4">
            No answers yet.
          </p>
        ) : (
          <div className="space-y-0">
            {answers.map((answer) => (
              <div
                key={answer.id}
                className="flex items-center gap-3 py-2 border-b border-[#e3e6e8]"
              >
                <span
                  className={`text-[13px] min-w-[40px] text-right font-medium ${
                    answer.score > 0 ? "text-[#2f6f44]" : answer.score < 0 ? "text-[#de4f54]" : "text-[#6a737c]"
                  }`}
                >
                  {answer.score}
                </span>
                <Link
                  href={`/questions/${answer.questionId}`}
                  className="text-[#0074cc] text-[13px] no-underline hover:text-[#0a95ff] truncate flex-1"
                >
                  {answer.questionTitle}
                </Link>
                <span className="text-[12px] text-[#838c95] shrink-0">
                  {timeAgo(answer.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )
      ) : questions.length === 0 ? (
        <p className="text-[13px] text-[#6a737c] py-4">
          No questions yet.
        </p>
      ) : (
        <div className="space-y-0">
          {questions.map((q) => (
            <div
              key={q.id}
              className="flex items-center gap-3 py-2 border-b border-[#e3e6e8]"
            >
              <span
                className={`text-[13px] min-w-[40px] text-right font-medium ${
                  q.score > 0 ? "text-[#2f6f44]" : q.score < 0 ? "text-[#de4f54]" : "text-[#6a737c]"
                }`}
              >
                {q.score}
              </span>
              <Link
                href={`/questions/${q.id}`}
                className="text-[#0074cc] text-[13px] no-underline hover:text-[#0a95ff] truncate flex-1"
              >
                {q.title}
              </Link>
              <span className="text-[12px] text-[#838c95] shrink-0">
                {q.answerCount} answers
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
