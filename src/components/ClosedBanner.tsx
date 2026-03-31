interface CloseVote {
  id: number;
  reason: string;
  userName: string;
}

export default function ClosedBanner({
  closeVotes,
}: {
  closeVotes: CloseVote[];
}) {
  if (closeVotes.length === 0) return null;

  const isClosed = closeVotes.length >= 3;
  const voters = closeVotes.map((v) => v.userName);
  // Most common reason
  const reasonCounts: Record<string, number> = {};
  for (const v of closeVotes) {
    reasonCounts[v.reason] = (reasonCounts[v.reason] || 0) + 1;
  }
  const topReason = Object.entries(reasonCounts).sort(
    (a, b) => b[1] - a[1]
  )[0][0];

  if (isClosed) {
    return (
      <div className="border border-[#e7c157] bg-[#fdf7e2] rounded-[3px] p-4 mb-4">
        <p className="text-[14px] text-[#3b4045] font-medium mb-1">
          Closed. This question is not accepting answers.
        </p>
        <p className="text-[13px] text-[#6a737c]">
          <strong>{topReason}</strong> — closed by{" "}
          {voters.map((name, i) => (
            <span key={i}>
              {i > 0 && ", "}
              <span className="text-[#f48225]">{name}</span>
            </span>
          ))}
        </p>
      </div>
    );
  }

  // Show close vote count as a subtle notice (like SO)
  return (
    <div className="text-[12px] text-[#838c95] mb-2">
      This question has {closeVotes.length} close{" "}
      {closeVotes.length === 1 ? "vote" : "votes"}.
    </div>
  );
}
