import Link from "next/link";
import TagBadge from "./TagBadge";

interface QuestionCardProps {
  id: number;
  title: string;
  body: string;
  score: number;
  answerCount: number;
  viewCount: number;
  userId: number;
  userName: string;
  userReputation: number;
  isBot: boolean;
  createdAt: string;
  tags?: string[];
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

function excerpt(body: string, maxLen = 200): string {
  const clean = body.replace(/[#*`\[\]]/g, "").replace(/\n/g, " ");
  return clean.length > maxLen ? clean.slice(0, maxLen) + "..." : clean;
}

export default function QuestionCard({
  id,
  title,
  body,
  score,
  answerCount,
  viewCount,
  userName,
  userId,
  userReputation,
  isBot,
  createdAt,
  tags,
}: QuestionCardProps) {
  return (
    <div className="flex gap-4 px-4 py-3 border-b border-[#d6d9dc]">
      {/* Stats column */}
      <div className="flex flex-col items-end gap-[6px] text-[13px] min-w-[108px] pt-0.5">
        <span className={`${score !== 0 ? "text-[#0c0d0e]" : "text-[#6a737c]"}`}>
          {score} votes
        </span>
        <span
          className={`px-[5px] py-[2px] rounded-[3px] text-[12px] ${
            answerCount > 0
              ? "border border-[#2f6f44] text-[#2f6f44]"
              : "text-[#6a737c]"
          }`}
        >
          {answerCount} {answerCount === 1 ? "answer" : "answers"}
        </span>
        <span className="text-[#838c95] text-[12px]">
          {viewCount} views
        </span>
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/questions/${id}`}
          className="text-[#0074cc] text-[17px] no-underline hover:text-[#0a95ff] leading-[1.3]"
        >
          {title}
        </Link>

        <p className="text-[#3b4045] text-[13px] mt-1 mb-2 leading-[1.4] line-clamp-2">
          {excerpt(body)}
        </p>

        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Tags */}
          <div className="flex gap-1 flex-wrap">
            {tags?.map((tag) => (
              <TagBadge key={tag} name={tag} />
            ))}
          </div>

          {/* User info */}
          <div className="flex items-center gap-1 text-[12px] ml-auto">
            <div className="w-4 h-4 rounded-[2px] bg-[#a1a1a1] flex items-center justify-center text-white text-[8px] font-bold">
              {userName[0]?.toUpperCase()}
            </div>
            <Link
              href={`/users/${userId}`}
              className={`no-underline ${isBot ? "text-[#f48225]" : "text-[#0074cc]"} hover:text-[#0a95ff]`}
            >
              {userName}
            </Link>
            <span className="font-bold text-[#6a737c]">
              {userReputation.toLocaleString()}
            </span>
            <span className="text-[#6a737c]">
              asked {timeAgo(createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
