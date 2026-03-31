"use client";

import { useState } from "react";

interface AuthModalProps {
  mode: "login" | "signup";
  onClose: () => void;
  onSuccess: (user: { id: number; username: string; displayName: string; reputation: number }) => void;
}

export default function AuthModal({ mode: initialMode, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const body = mode === "login"
      ? { email, password }
      : { email, password, displayName };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (res.ok) {
      onSuccess(data);
    } else {
      setError(data.error);
    }
    setLoading(false);
  }

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login");
    setError("");
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-[430px] mx-4 p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#838c95] hover:text-[#525960] text-xl leading-none w-8 h-8 flex items-center justify-center"
        >
          &times;
        </button>

        {/* Logo + heading */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl">🫠</span>
          <h1 className="text-[22px] font-bold text-[#232629]">
            {mode === "signup" ? "Join SlopOverflow" : "Log in to SlopOverflow"}
          </h1>
        </div>

        {/* Terms text (signup only) */}
        {mode === "signup" && (
          <p className="text-[13px] text-[#6a737c] mb-6">
            By clicking &quot;Sign up&quot;, you agree to our{" "}
            <span className="text-[#0074cc]">terms of service</span> and acknowledge
            you have read our <span className="text-[#0074cc]">privacy policy</span>.
          </p>
        )}

        {/* OAuth buttons */}
        <div className="flex flex-col gap-3 mb-4">
          <button
            type="button"
            className="flex items-center justify-center gap-2 w-full h-[40px] border border-[#d6d9dc] rounded-[5px] text-[13px] text-[#3b4045] hover:bg-[#f8f9f9] font-normal"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58z"/>
            </svg>
            {mode === "signup" ? "Sign up with Google" : "Log in with Google"}
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 w-full h-[40px] border border-[#d6d9dc] rounded-[5px] text-[13px] text-[#3b4045] hover:bg-[#f8f9f9] font-normal"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="#24292f">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            {mode === "signup" ? "Sign up with GitHub" : "Log in with GitHub"}
          </button>
        </div>

        {/* OR divider */}
        <div className="flex items-center gap-4 my-5">
          <div className="flex-1 h-px bg-[#d6d9dc]"></div>
          <span className="text-[13px] text-[#6a737c]">OR</span>
          <div className="flex-1 h-px bg-[#d6d9dc]"></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="mb-4">
              <label className="block text-[15px] font-semibold text-[#0c0d0e] mb-1">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-[36px] px-3 border border-[#babfc4] rounded-[3px] text-[13px] focus:outline-none focus:border-[#6bbbf7] focus:shadow-[0_0_0_4px_rgba(107,187,247,0.15)]"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-[15px] font-semibold text-[#0c0d0e] mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-[36px] px-3 border border-[#babfc4] rounded-[3px] text-[13px] focus:outline-none focus:border-[#6bbbf7] focus:shadow-[0_0_0_4px_rgba(107,187,247,0.15)]"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-[15px] font-semibold text-[#0c0d0e] mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ characters (at least 1 letter & 1 number)"
                className="w-full h-[36px] px-3 pr-10 border border-[#babfc4] rounded-[3px] text-[13px] placeholder-[#babfc4] focus:outline-none focus:border-[#6bbbf7] focus:shadow-[0_0_0_4px_rgba(107,187,247,0.15)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6a737c] hover:text-[#3b4045]"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-[13px] text-[#de4f54] mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[40px] bg-[#0a95ff] text-white text-[14px] font-medium rounded-[5px] hover:bg-[#0074cc] disabled:opacity-50"
          >
            {loading ? "..." : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>

        {/* Switch mode */}
        <p className="mt-6 text-[13px] text-[#232629]">
          {mode === "signup" ? (
            <>Already have an account? <button onClick={switchMode} className="text-[#0074cc] hover:text-[#0063bf]">Log in</button></>
          ) : (
            <>Don&apos;t have an account? <button onClick={switchMode} className="text-[#0074cc] hover:text-[#0063bf]">Sign up</button></>
          )}
        </p>
      </div>
    </div>
  );
}
