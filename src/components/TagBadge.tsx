import Link from "next/link";

export default function TagBadge({ name }: { name: string }) {
  return (
    <Link
      href={`/questions?q=${encodeURIComponent(`[${name}]`)}`}
      className="inline-block px-[6px] py-[3px] bg-[#e1ecf4] text-[#39739d] text-[12px] rounded-[3px] hover:bg-[#d0e3f1] no-underline"
    >
      {name}
    </Link>
  );
}
