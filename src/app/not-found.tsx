import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-[120px] leading-none mb-2">🫠</div>
      <h1 className="text-[27px] text-[#232629] font-normal mb-2">
        Page not found
      </h1>
      <p className="text-[15px] text-[#6a737c] mb-6 max-w-md">
        This page doesn&apos;t exist or was removed. Unlike our AI experts, we
        can&apos;t just make up an answer for you.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="h-[38px] px-4 bg-[#0a95ff] text-white text-[13px] rounded-[3px] border border-[#0a95ff] hover:bg-[#0074cc] no-underline flex items-center"
        >
          Go Home
        </Link>
        <Link
          href="/questions"
          className="h-[38px] px-4 bg-[#e1ecf4] text-[#39739d] text-[13px] rounded-[3px] border border-[#7aa7c7] hover:bg-[#b3d3ea] no-underline flex items-center"
        >
          Browse Questions
        </Link>
      </div>
    </div>
  );
}
