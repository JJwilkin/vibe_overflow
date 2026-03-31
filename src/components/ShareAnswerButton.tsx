"use client";

import { useState, useRef } from "react";

interface ShareAnswerButtonProps {
  answerId: number;
  questionId: number;
  userName: string;
  userReputation: number;
  isBot: boolean;
  body: string;
}

export default function ShareAnswerButton({
  answerId,
  questionId,
  userName,
  userReputation,
  isBot,
  body,
}: ShareAnswerButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/questions/${questionId}#answer-${answerId}`
      : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 1500);
    } catch {
      // fallback
    }
  }

  async function exportImage() {
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");

      // Build a temporary styled element for export
      const el = document.createElement("div");
      el.style.cssText =
        "padding:24px;background:#fff;width:600px;font-family:system-ui,-apple-system,sans-serif;border:1px solid #d6d9dc;border-radius:6px;";

      // Header
      const header = document.createElement("div");
      header.style.cssText =
        "display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e3e6e8;";
      header.innerHTML = `
        <div style="width:32px;height:32px;border-radius:3px;background:#a1a1a1;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:bold;">${userName[0]?.toUpperCase() || "?"}</div>
        <div>
          <div style="font-size:13px;color:${isBot ? "#f48225" : "#0074cc"};font-weight:500;">${userName}${isBot ? ' <span style="font-size:10px;background:#f48225;color:#fff;padding:1px 4px;border-radius:2px;margin-left:4px;">BOT</span>' : ""}</div>
          <div style="font-size:12px;color:#6a737c;font-weight:bold;">${userReputation.toLocaleString()} rep</div>
        </div>
      `;
      el.appendChild(header);

      // Body — plain text excerpt
      const bodyEl = document.createElement("div");
      const excerpt = body
        .replace(/[#*`\[\]]/g, "")
        .slice(0, 500);
      bodyEl.style.cssText =
        "font-size:14px;color:#232629;line-height:1.6;white-space:pre-wrap;word-break:break-word;";
      bodyEl.textContent =
        excerpt + (body.length > 500 ? "..." : "");
      el.appendChild(bodyEl);

      // Footer
      const footer = document.createElement("div");
      footer.style.cssText =
        "margin-top:16px;padding-top:12px;border-top:1px solid #e3e6e8;font-size:11px;color:#9199a1;display:flex;justify-content:space-between;";
      footer.innerHTML = `<span>SlopOverflow</span><span>slopoverflow.dev/questions/${questionId}</span>`;
      el.appendChild(footer);

      document.body.appendChild(el);

      const dataUrl = await toPng(el, { pixelRatio: 2 });

      document.body.removeChild(el);

      // Download
      const link = document.createElement("a");
      link.download = `slopoverflow-answer-${answerId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
      setShowMenu(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="text-[13px] text-[#6a737c] hover:text-[#0074cc] flex items-center gap-1"
      >
        <svg
          className="w-[14px] h-[14px]"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
        </svg>
        Share
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div
            ref={menuRef}
            className="absolute bottom-full mb-2 left-0 bg-white border border-[#d6d9dc] rounded-[6px] shadow-lg z-50 w-[200px] py-1"
          >
            <button
              onClick={copyLink}
              className="w-full px-3 py-2 text-left text-[13px] text-[#232629] hover:bg-[#f1f2f3] flex items-center gap-2"
            >
              {copied ? (
                <>
                  <svg
                    className="w-4 h-4 text-[#2f6f44]"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy link
                </>
              )}
            </button>
            <button
              onClick={exportImage}
              disabled={exporting}
              className="w-full px-3 py-2 text-left text-[13px] text-[#232629] hover:bg-[#f1f2f3] flex items-center gap-2 disabled:opacity-50"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {exporting ? "Exporting..." : "Save as image"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
