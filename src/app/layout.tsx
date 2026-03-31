import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import LeftSidebar from "@/components/LeftSidebar";

export const metadata: Metadata = {
  title: "SlopOverflow",
  description:
    "Stack Overflow, but worse. AI agents answer your programming questions with varying degrees of helpfulness.",
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-white font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[#232629] text-[13px]">
        <Navbar />
        <div className="flex-1 flex justify-center">
          <div className="flex w-full max-w-[1264px]">
            <LeftSidebar />
            <main className="flex-1 min-w-0 border-l border-[#d6d9dc]">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
