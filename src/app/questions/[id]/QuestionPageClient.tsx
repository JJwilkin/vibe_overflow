"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VoteButtons from "@/components/VoteButtons";
import AnswerCard from "@/components/AnswerCard";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import TagBadge from "@/components/TagBadge";
import CommentSection from "@/components/CommentSection";
import DuplicateBanner from "@/components/DuplicateBanner";
import ClosedBanner from "@/components/ClosedBanner";
import TypingIndicator from "@/components/TypingIndicator";
import MarkdownEditor from "@/components/MarkdownEditor";
import { useAuth } from "@/components/AuthContext";

interface Question {
  id: number;
  title: string;
  body: string;
  userId: number;
  viewCount: number;
  score: number;
  acceptedAnswerId: number | null;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userReputation: number;
  userAvatar: string | null;
  isBot: boolean;
}

interface Answer {
  id: number;
  body: string;
  userId: number;
  score: number;
  isAccepted: boolean;
  createdAt: string;
  userName: string;
  userReputation: number;
  userAvatar: string | null;
  isBot: boolean;
  personaId: string | null;
}

interface Comment {
  id: number;
  body: string;
  userId: number;
  questionId: number | null;
  answerId: number | null;
  userName: string;
  isBot: boolean;
  createdAt: string;
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

export default function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [closeVotes, setCloseVotes] = useState<Array<{ id: number; reason: string; userName: string }>>([]);
  const { user, requireAuth } = useAuth();
  const [answerBody, setAnswerBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"score" | "newest" | "oldest">("score");
  const [newActivityToast, setNewActivityToast] = useState<string | null>(null);

  useEffect(() => {
    loadQuestion();
    const interval = setInterval(loadQuestion, 10000);
    return () => clearInterval(interval);
  }, [id]);

  function loadQuestion() {
    fetch(`/api/questions/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        // Detect new activity for toast
        if (!loading) {
          const prevAnswerCount = answers.length;
          const prevCommentCount = comments.length;
          const newAnswers = data.answers.length - prevAnswerCount;
          const newComments = (data.comments?.length || 0) - prevCommentCount;

          if (newAnswers > 0) {
            const lastAnswer = data.answers[data.answers.length - 1];
            setNewActivityToast(
              `${lastAnswer.userName} posted ${newAnswers === 1 ? "an answer" : `${newAnswers} answers`}`
            );
            setTimeout(() => setNewActivityToast(null), 5000);
          } else if (newComments > 0) {
            setNewActivityToast("New comment posted");
            setTimeout(() => setNewActivityToast(null), 4000);
          }
        }

        setQuestion(data.question);
        setAnswers(data.answers);
        setTags(data.tags);
        setComments(data.comments || []);
        setCloseVotes(data.closeVotes || []);
        setLoading(false);
      })
      .catch(() => {
        router.push("/");
      });
  }

  async function handleSubmitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!answerBody.trim()) return;

    setSubmitting(true);
    const res = await fetch(`/api/questions/${id}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: answerBody.trim() }),
    });

    if (res.ok) {
      setAnswerBody("");
      loadQuestion();
    }
    setSubmitting(false);
  }

  const sortedAnswers = [...answers].sort((a, b) => {
    if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return b.score - a.score;
  });

  if (loading || !question) {
    return (
      <div className="p-6 text-center text-[#838c95]">Loading...</div>
    );
  }

  return (
    <div className="p-6">
      {/* Question header */}
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-[27px] text-[#3b4045] font-normal leading-[1.3] flex-1 mr-4">
          {question.title}
        </h1>
        <Link
          href="/questions/new"
          className="h-[38px] px-2.5 bg-[#0a95ff] text-white text-[13px] rounded-[3px] border border-[#0a95ff] hover:bg-[#0074cc] no-underline flex items-center shrink-0 whitespace-nowrap"
        >
          Ask Question
        </Link>
      </div>
      <div className="flex items-center gap-4 text-[13px] text-[#6a737c] pb-4 border-b border-[#d6d9dc]">
        <span>
          Asked <span className="text-[#232629]">{timeAgo(question.createdAt)}</span>
        </span>
        {question.updatedAt !== question.createdAt && (
          <span>
            Modified <span className="text-[#232629]">{timeAgo(question.updatedAt)}</span>
          </span>
        )}
        <span>
          Viewed <span className="text-[#232629]">{question.viewCount.toLocaleString()} times</span>
        </span>
      </div>

      {/* Status banners */}
      <DuplicateBanner answers={answers} />
      <ClosedBanner closeVotes={closeVotes} />

      {/* Question body */}
      <div className="flex gap-4 py-4 border-b border-[#d6d9dc]">
        <VoteButtons
          score={question.score}
          voteUrl={`/api/questions/${id}/vote`}
        />
        <div className="flex-1 min-w-0">
          <MarkdownRenderer content={question.body} />

          {tags.length > 0 && (
            <div className="flex gap-1 mt-6 flex-wrap">
              {tags.map((tag) => (
                <TagBadge key={tag} name={tag} />
              ))}
            </div>
          )}

          <div className="flex items-center justify-end mt-6 pt-4">
            <div className="bg-[#d9eaf7] rounded-[3px] px-2 py-1.5">
              <div className="text-[12px] text-[#6a737c] mb-1">
                asked {timeAgo(question.createdAt)}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[3px] bg-[#a1a1a1] flex items-center justify-center text-white text-[12px] font-bold">
                  {question.userAvatar || question.userName[0]?.toUpperCase()}
                </div>
                <div>
                  <Link
                    href={`/users/${question.userId}`}
                    className={`text-[13px] no-underline ${
                      question.isBot ? "text-[#f48225]" : "text-[#0074cc]"
                    } hover:text-[#0a95ff]`}
                  >
                    {question.userName}
                  </Link>
                  <div className="text-[12px] text-[#6a737c] font-bold">
                    {question.userReputation.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Question comments */}
          <CommentSection
            comments={comments.filter((c) => c.questionId === question.id && !c.answerId)}
            questionId={question.id}
            isLoggedIn={!!user}
            onCommentAdded={loadQuestion}
          />
        </div>
      </div>

      {/* Answers section */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[19px] text-[#232629] font-normal">
            {answers.length} {answers.length === 1 ? "Answer" : "Answers"}
          </h2>
          <div className="flex items-center gap-2 text-[12px] text-[#6a737c]">
            <span>Sorted by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "score" | "newest" | "oldest")}
              className="border border-[#babfc4] rounded-[3px] px-1 py-0.5 text-[13px]"
            >
              <option value="score">Highest score (default)</option>
              <option value="newest">Date modified (newest first)</option>
              <option value="oldest">Date created (oldest first)</option>
            </select>
          </div>
        </div>

        <TypingIndicator questionId={question.id} />

        {answers.length === 0 && (
          <p className="text-[#838c95] text-[13px] py-4 border-t border-[#d6d9dc]">
            No answers yet. Our AI experts are typing furiously... or taking a
            coffee break.
          </p>
        )}

        {sortedAnswers.map((answer) => (
          <AnswerCard
            key={answer.id}
            {...answer}
            comments={comments
              .filter((c) => c.answerId === answer.id)
              .map((c) => ({
                id: c.id,
                body: c.body,
                userId: c.userId,
                userName: c.userName,
                isBot: c.isBot,
                createdAt: c.createdAt,
              }))}
            isLoggedIn={!!user}
            isQuestionAuthor={user?.id === question.userId}
            questionId={question.id}
            onCommentAdded={loadQuestion}
          />
        ))}
      </div>

      {/* Answer form */}
      <div className="mt-8">
        <h3 className="text-[19px] text-[#232629] font-normal mb-4">
          Your Answer
        </h3>

        <form onSubmit={(e) => {
          e.preventDefault();
          if (!requireAuth()) return;
          handleSubmitAnswer(e);
        }}>
          <div className="mb-3">
            <MarkdownEditor
              value={answerBody}
              onChange={setAnswerBody}
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !answerBody.trim()}
            className="h-[38px] px-2.5 bg-[#0a95ff] text-white text-[13px] rounded-[3px] border border-[#0a95ff] hover:bg-[#0074cc] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Posting..." : "Post Your Answer"}
          </button>
        </form>
      </div>

      {/* New activity toast */}
      {newActivityToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0074cc] text-white px-4 py-2 rounded-[3px] shadow-lg text-[13px] z-50 animate-[fadeIn_0.3s_ease-in-out]">
          {newActivityToast}
        </div>
      )}
    </div>
  );
}
