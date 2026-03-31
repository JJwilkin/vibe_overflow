interface DuplicateBannerProps {
  answers: Array<{
    personaId: string | null;
    body: string;
    userName: string;
  }>;
}

export default function DuplicateBanner({ answers }: DuplicateBannerProps) {
  const daveAnswer = answers.find((a) => a.personaId === "duplicate_dave");
  if (!daveAnswer) return null;

  // Extract bracketed "question titles" from Dave's answer
  const linkPattern = /[""\[\(](.*?(?:question|how|what|why|when|can|does|is)[^"""\]\)]*?)[""\]\)]/gi;
  const matches: string[] = [];
  let match;
  while ((match = linkPattern.exec(daveAnswer.body)) !== null) {
    if (match[1].length > 10 && match[1].length < 200) {
      matches.push(match[1]);
    }
  }

  // Fallback: if no matches, use a generic message
  const dupeLinks =
    matches.length > 0
      ? matches.slice(0, 3)
      : ["How to do the exact same thing you're asking about"];

  return (
    <div className="border border-[#e7c157] bg-[#fdf7e2] rounded-[3px] p-4 mb-4">
      <div className="flex items-start gap-2">
        <svg
          className="w-5 h-5 text-[#e7c157] shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" />
        </svg>
        <div>
          <p className="text-[13px] text-[#3b4045] font-medium mb-1">
            This question already has answers here:
          </p>
          <ul className="list-none m-0 p-0 space-y-0.5">
            {dupeLinks.map((title, i) => (
              <li key={i} className="text-[13px]">
                <span className="text-[#0074cc] cursor-pointer hover:text-[#0a95ff]">
                  {title}
                </span>
                <span className="text-[#6a737c] ml-1">(1 answer)</span>
              </li>
            ))}
          </ul>
          <p className="text-[12px] text-[#6a737c] mt-2">
            Marked as duplicate by{" "}
            <span className="text-[#f48225]">{daveAnswer.userName}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
