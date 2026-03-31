"use client";

import { useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write your answer... (supports Markdown)",
  rows = 10,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");

  return (
    <div className="border border-[#babfc4] rounded-[3px] overflow-hidden focus-within:border-[#6bbbf7] focus-within:shadow-[0_0_0_4px_rgba(107,187,247,0.15)]">
      {/* Tab bar */}
      <div className="flex border-b border-[#d6d9dc] bg-[#f8f9f9]">
        <button
          type="button"
          onClick={() => setTab("write")}
          className={`px-4 py-2 text-[13px] border-b-2 -mb-px ${
            tab === "write"
              ? "border-[#f48225] text-[#232629] font-medium bg-white"
              : "border-transparent text-[#6a737c] hover:text-[#232629]"
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className={`px-4 py-2 text-[13px] border-b-2 -mb-px ${
            tab === "preview"
              ? "border-[#f48225] text-[#232629] font-medium bg-white"
              : "border-transparent text-[#6a737c] hover:text-[#232629]"
          }`}
        >
          Preview
        </button>
      </div>

      {/* Content */}
      {tab === "write" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full p-3 text-[15px] font-mono border-0 outline-none resize-y"
        />
      ) : (
        <div className="p-4 min-h-[200px]">
          {value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-[#838c95] text-[13px] italic">
              Nothing to preview
            </p>
          )}
        </div>
      )}
    </div>
  );
}
