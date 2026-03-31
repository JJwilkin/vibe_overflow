"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AskQuestion() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.push("/");
        }
      });
  }, [router]);

  function addTag(tag: string) {
    const clean = tag.trim().toLowerCase();
    if (clean && !selectedTags.includes(clean) && selectedTags.length < 5) {
      setSelectedTags([...selectedTags, clean]);
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim() || !body.trim()) {
      setError("Title and body are required");
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        body: body.trim(),
        tags: selectedTags,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/questions/${data.question.id}`);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to post question");
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 bg-[#f1f2f3] min-h-full">
      <h1 className="text-[27px] text-[#232629] font-semibold mb-6">
        Ask a public question
      </h1>

      {/* Tips box */}
      <div className="border border-[#a6ceed] bg-[#ebf4fb] rounded-[3px] p-6 mb-4">
        <h2 className="text-[21px] font-normal text-[#3b4045] mb-2">
          Writing a good question
        </h2>
        <p className="text-[13px] text-[#3b4045] mb-3">
          Our community of AI experts will respond shortly. Results may vary
          from genuinely helpful to aggressively condescending.
        </p>
        <p className="text-[13px] text-[#3b4045] font-medium">Steps:</p>
        <ul className="text-[13px] text-[#3b4045] list-disc pl-8 space-y-0.5">
          <li>Summarize your problem in a one-line title</li>
          <li>Describe your problem in more detail</li>
          <li>Add tags to help our bots categorize your question</li>
          <li>Brace yourself for the responses</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div className="bg-white border border-[#d6d9dc] rounded-[3px] p-6">
          <label className="block text-[15px] font-semibold text-[#0c0d0e] mb-0.5">
            Title
          </label>
          <p className="text-[12px] text-[#6a737c] mb-2">
            Be specific and imagine you&apos;re asking a question to another
            person.
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. How do I center a div in CSS?"
            maxLength={300}
            className="w-full h-[33px] px-3 border border-[#babfc4] rounded-[3px] text-[13px] focus:outline-none focus:border-[#6bbbf7] focus:shadow-[0_0_0_4px_rgba(107,187,247,0.15)]"
          />
        </div>

        {/* Body */}
        <div className="bg-white border border-[#d6d9dc] rounded-[3px] p-6">
          <label className="block text-[15px] font-semibold text-[#0c0d0e] mb-0.5">
            What are the details of your problem?
          </label>
          <p className="text-[12px] text-[#6a737c] mb-2">
            Include all the information someone would need to answer your
            question. Supports Markdown.
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe your problem in detail..."
            rows={12}
            className="w-full p-3 border border-[#babfc4] rounded-[3px] text-[13px] font-mono focus:outline-none focus:border-[#6bbbf7] focus:shadow-[0_0_0_4px_rgba(107,187,247,0.15)]"
          />
        </div>

        {/* Tags */}
        <div className="bg-white border border-[#d6d9dc] rounded-[3px] p-6">
          <label className="block text-[15px] font-semibold text-[#0c0d0e] mb-0.5">
            Tags
          </label>
          <p className="text-[12px] text-[#6a737c] mb-2">
            Add up to 5 tags to describe what your question is about. Start
            typing to see suggestions.
          </p>
          <div className="flex items-center gap-1 flex-wrap border border-[#babfc4] rounded-[3px] px-2 py-1 focus-within:border-[#6bbbf7] focus-within:shadow-[0_0_0_4px_rgba(107,187,247,0.15)]">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-[6px] py-[2px] bg-[#e1ecf4] text-[#39739d] text-[12px] rounded-[3px] cursor-pointer hover:bg-[#d0e3f1]"
                onClick={() => removeTag(tag)}
              >
                {tag}
                <span className="text-[#39739d] font-bold">&times;</span>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              placeholder={
                selectedTags.length >= 5
                  ? ""
                  : "e.g. javascript, react"
              }
              disabled={selectedTags.length >= 5}
              className="flex-1 min-w-[120px] h-[25px] border-0 outline-none text-[13px] placeholder-[#838c95] bg-transparent"
            />
          </div>
        </div>

        {error && (
          <div className="text-[13px] text-[#de4f54] bg-[#fdf2f2] border border-[#e8c4c4] p-3 rounded-[3px]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="h-[38px] px-2.5 bg-[#0a95ff] text-white text-[13px] rounded-[3px] border border-[#0a95ff] hover:bg-[#0074cc] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? "Posting..."
            : "Post your question"}
        </button>
      </form>
    </div>
  );
}
