"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const router = useRouter();
  const { user, setUser, openAuth } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("so-dark-mode");
    if (saved === "true") {
      setDarkMode(true);
      document.documentElement.classList.add("so-dark");
    }
  }, []);

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    setUser(null);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/questions?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  return (
    <header className="sticky top-0 z-50 h-[50px] flex items-center bg-[#f8f9f9] border-t-[3px] border-t-[#f48225] border-b border-b-[#d6d9dc] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex items-center w-full max-w-[1264px] mx-auto h-full px-2">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center h-full px-2 hover:bg-[#e3e6e8] no-underline shrink-0"
        >
          <span className="text-xl mr-0.5">🫠</span>
          <span className="text-[15px] ml-0.5">
            <span className="font-normal text-[#242629]">slop</span>
            <span className="font-bold text-[#242629]">overflow</span>
          </span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-[750px] mx-4 relative">
          <div className="relative">
            <svg
              className="absolute left-2 top-1/2 -translate-y-1/2 text-[#838c95] w-[18px] h-[18px]"
              fill="currentColor"
              viewBox="0 0 18 18"
            >
              <path d="M18 16.5l-5.14-5.18h-.35a7 7 0 10-1.19 1.19v.35L16.5 18l1.5-1.5zM12 7A5 5 0 112 7a5 5 0 0110 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[33px] pl-8 pr-3 border border-[#babfc4] rounded-[3px] text-[13px] bg-white placeholder-[#838c95] focus:outline-none focus:border-[#6bbbf7] focus:shadow-[0_0_0_4px_rgba(107,187,247,0.15)]"
            />
          </div>
        </form>

        {/* Notifications */}
        {user && <NotificationBell />}

        {/* Dark mode toggle */}
        <button
          onClick={() => {
            const next = !darkMode;
            setDarkMode(next);
            document.documentElement.classList.toggle("so-dark", next);
            localStorage.setItem("so-dark-mode", String(next));
          }}
          className="w-[33px] h-[33px] flex items-center justify-center text-[#525960] hover:bg-[#e3e6e8] rounded-[3px] mr-1"
          title={darkMode ? "Light mode" : "Dark mode"}
        >
          {darkMode ? "☀️" : "🌙"}
        </button>

        {/* Auth */}
        <div className="flex items-center gap-1 shrink-0">
          {user && !user.isAnonymous ? (
            <>
              <Link
                href={`/users/${user.id}`}
                className="flex items-center gap-1 h-full px-3 py-1 text-[12px] text-[#525960] hover:bg-[#e3e6e8] no-underline"
              >
                <div className="w-6 h-6 rounded-[3px] bg-[#a1a1a1] flex items-center justify-center text-white text-[10px] font-bold">
                  {user.displayName[0].toUpperCase()}
                </div>
                <span className="font-bold text-[#0c0d0e]">
                  {user.reputation.toLocaleString()}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-[12px] text-[#838c95] hover:text-[#525960] px-2"
              >
                log out
              </button>
            </>
          ) : user?.isAnonymous ? (
            <>
              <span className="text-[12px] text-[#6a737c] px-1">
                {user.displayName}
              </span>
              <button
                onClick={() => openAuth("signup")}
                className="h-[33px] px-2.5 bg-[#0a95ff] text-white text-[13px] rounded-[3px] border border-[#0a95ff] hover:bg-[#0074cc]"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => openAuth("login")}
                className="h-[33px] px-2.5 bg-[#e1ecf4] text-[#39739d] text-[13px] rounded-[3px] border border-[#7aa7c7] hover:bg-[#b3d3ea] hover:text-[#2c5877]"
              >
                Log in
              </button>
              <button
                onClick={() => openAuth("signup")}
                className="h-[33px] px-2.5 bg-[#0a95ff] text-white text-[13px] rounded-[3px] border border-[#0a95ff] hover:bg-[#0074cc]"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
