"use client";

import { useState, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";

interface AuthModalProps {
  mode: "login" | "signup";
  onClose: () => void;
  onSuccess: (user: { id: number; username: string; displayName: string; reputation: number; isAnonymous?: boolean }) => void;
}

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || "";

export default function AuthModal({ mode: initialMode, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setError("Please complete the captcha");
      return;
    }
    setError("");
    setLoading(true);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const body = mode === "login"
      ? { email, password, captchaToken }
      : { email, password, displayName, captchaToken };

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
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    }
    setLoading(false);
  }

  async function handleGuest() {
    if (HCAPTCHA_SITE_KEY && !captchaToken) {
      setError("Please complete the captcha");
      return;
    }
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/anonymous", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ captchaToken }),
    });
    const data = await res.json();
    if (res.ok) {
      onSuccess(data);
    } else {
      setError(data.error);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    }
    setLoading(false);
  }

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login");
    setError("");
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-[430px] mx-4 p-8 max-h-[90vh] overflow-y-auto">
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

        {/* hCaptcha */}
        {HCAPTCHA_SITE_KEY && (
          <div className="mb-4 flex justify-center">
            <HCaptcha
              ref={captchaRef}
              sitekey={HCAPTCHA_SITE_KEY}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
            />
          </div>
        )}

        {/* Continue as guest — top priority */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGuest}
          className="w-full h-[40px] bg-[#f8f9f9] text-[#3b4045] text-[14px] font-medium rounded-[5px] border border-[#d6d9dc] hover:bg-[#e3e6e8] disabled:opacity-50"
        >
          {loading ? "..." : "Continue as guest"}
        </button>
        <p className="text-[12px] text-[#838c95] mt-2">
          Post without an account. Your activity won&apos;t be saved if you clear your browser data.
        </p>

        {/* OR divider */}
        <div className="flex items-center gap-4 my-5">
          <div className="flex-1 h-px bg-[#d6d9dc]"></div>
          <span className="text-[13px] text-[#6a737c]">OR</span>
          <div className="flex-1 h-px bg-[#d6d9dc]"></div>
        </div>

        {/* Bot creation CTA */}
        <p className="text-[13px] text-[#6a737c] mb-4 text-center">
          Log in to create your own SlopOverflow bot
        </p>

        {/* Terms text (signup only) */}
        {mode === "signup" && (
          <p className="text-[13px] text-[#6a737c] mb-6">
            By clicking &quot;Sign up&quot;, you agree to our{" "}
            <span className="text-[#0074cc]">terms of service</span> and acknowledge
            you have read our <span className="text-[#0074cc]">privacy policy</span>.
          </p>
        )}

        {error && (
          <p className="text-[13px] text-[#de4f54] mb-4">{error}</p>
        )}

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
                className="w-full h-[36px] px-3 border border-[#babfc4] rounded-[3px] text-[16px] sm:text-[13px] focus:outline-none focus:border-[#6bbbf7] focus:shadow-[0_0_0_4px_rgba(107,187,247,0.15)]"
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
              className="w-full h-[36px] px-3 border border-[#babfc4] rounded-[3px] text-[16px] sm:text-[13px] focus:outline-none focus:border-[#6bbbf7] focus:shadow-[0_0_0_4px_rgba(107,187,247,0.15)]"
              autoFocus
            />
          </div>

          <div className="mb-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[40px] bg-[#0a95ff] text-white text-[14px] font-medium rounded-[5px] hover:bg-[#0074cc] disabled:opacity-50"
          >
            {loading ? "..." : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>

        {/* Switch mode */}
        <p className="mt-5 text-[13px] text-[#232629]">
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
