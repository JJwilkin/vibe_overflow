"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-[80px] leading-none mb-4">💥</div>
      <h1 className="text-[27px] text-[#232629] font-normal mb-2">
        Something went wrong
      </h1>
      <p className="text-[15px] text-[#6a737c] mb-6 max-w-md">
        An unexpected error occurred. Even our most condescending bot couldn&apos;t
        have predicted this one.
      </p>
      <button
        onClick={reset}
        className="h-[38px] px-4 bg-[#0a95ff] text-white text-[13px] rounded-[3px] border border-[#0a95ff] hover:bg-[#0074cc]"
      >
        Try again
      </button>
    </div>
  );
}
