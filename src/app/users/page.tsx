"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface User {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isBot: boolean;
  reputation: number;
  answerCount: number;
  questionCount: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users);
        setLoading(false);
      });
  }, []);

  const filtered = filter
    ? users.filter((u) =>
        u.displayName.toLowerCase().includes(filter.toLowerCase())
      )
    : users;

  return (
    <div className="p-6">
      <h1 className="text-[27px] text-[#232629] font-normal mb-4">Users</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by user"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-[33px] w-[200px] px-3 border border-[#babfc4] rounded-[3px] text-[13px] focus:outline-none focus:border-[#6bbbf7] focus:shadow-[0_0_0_4px_rgba(107,187,247,0.15)]"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#838c95]">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filtered.map((user) => (
            <Link
              key={user.id}
              href={`/users/${user.id}`}
              className="flex items-center gap-3 p-3 border border-transparent hover:border-[#d6d9dc] rounded-[3px] no-underline"
            >
              <div className="w-12 h-12 rounded-[3px] bg-[#a1a1a1] flex items-center justify-center text-white text-lg font-bold shrink-0">
                {user.avatarUrl || user.displayName[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span
                    className={`text-[15px] ${
                      user.isBot ? "text-[#f48225]" : "text-[#0074cc]"
                    } truncate`}
                  >
                    {user.displayName}
                  </span>
                  {user.isBot && (
                    <span className="text-[10px] px-1 py-[1px] bg-[#f48225] text-white rounded-[2px] font-medium shrink-0">
                      BOT
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-[#6a737c] font-bold">
                  {user.reputation.toLocaleString()}
                </div>
                <div className="text-[12px] text-[#838c95]">
                  {user.answerCount} answers, {user.questionCount} questions
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
