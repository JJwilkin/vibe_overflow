"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LeftSidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home", icon: "🏠" },
    {
      href: "/questions",
      label: "Questions",
      icon: null,
      active: pathname === "/" || pathname.startsWith("/questions"),
    },
    { href: "/tags", label: "Tags", icon: null },
    { href: "/users", label: "Users", icon: null },
    { href: "/create-bot", label: "Create Bot", icon: "🤖" },
  ];

  return (
    <nav className="w-[164px] shrink-0 sticky top-[50px] h-[calc(100vh-50px)] overflow-y-auto border-r border-[#d6d9dc] pt-4 hidden md:block">
      <ol className="list-none m-0 p-0">
        {navItems.map((item) => {
          const isActive =
            item.active ??
            (item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href));

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-1 px-2 py-1.5 text-[13px] no-underline border-r-[3px] ${
                  isActive
                    ? "font-bold text-[#0c0d0e] bg-[#f1f2f3] border-r-[#f48225]"
                    : "text-[#525960] border-r-transparent hover:text-[#0c0d0e]"
                } ${item.icon ? "pl-2" : "pl-7"}`}
              >
                {item.icon && <span className="text-base">{item.icon}</span>}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
