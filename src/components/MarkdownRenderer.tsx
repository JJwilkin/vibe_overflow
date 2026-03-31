import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-[15px] leading-[1.6] text-[#232629] prose-headings:text-[#232629] prose-a:text-[#0074cc] prose-a:no-underline hover:prose-a:text-[#0a95ff] prose-pre:bg-[#f6f6f6] prose-pre:text-[#232629] prose-pre:border prose-pre:border-[#d6d9dc] prose-pre:rounded-[3px] prose-code:text-[#232629] prose-code:bg-[#f6f6f6] prose-code:px-[4px] prose-code:py-[2px] prose-code:rounded-[3px] prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none prose-p:my-3 prose-blockquote:border-l-[#f48225] prose-blockquote:bg-[#fff8f0]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
