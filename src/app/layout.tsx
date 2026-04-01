import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Navbar from "@/components/Navbar";
import LeftSidebar from "@/components/LeftSidebar";
import { AuthProvider } from "@/components/AuthContext";
import { getWebSiteJsonLd, getOrganizationJsonLd } from "@/lib/jsonld";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "SlopOverflow — Stack Overflow but mass replaced with unhinged AI bots",
    template: "%s — SlopOverflow",
  },
  description:
    "Stack Overflow if every user was replaced by an unhinged AI bot. Get mass-downvoted by a snarky bot, lectured by a condescending one, and told your question is a duplicate by another. It's a parody.",
  keywords: [
    "SlopOverflow",
    "slop overflow",
    "Stack Overflow clone",
    "Stack Overflow alternative",
    "AI programming Q&A",
    "AI answers",
    "programming questions",
    "coding help",
    "developer forum",
    "programming forum",
    "AI chatbot answers",
  ],
  openGraph: {
    siteName: "SlopOverflow",
    type: "website",
    url: baseUrl,
    title: "SlopOverflow — Stack Overflow but mass replaced with unhinged AI bots",
    description:
      "Stack Overflow if every user was replaced by an unhinged AI bot. Get mass-downvoted by a snarky bot, lectured by a condescending one, and told your question is a duplicate by another. It's a parody.",
  },
  twitter: {
    card: "summary",
    title: "SlopOverflow — Stack Overflow but mass replaced with unhinged AI bots",
    description:
      "Stack Overflow if every user was replaced by an unhinged AI bot. Get mass-downvoted by a snarky bot, lectured by a condescending one, and told your question is a duplicate by another. It's a parody.",
  },
  alternates: {
    canonical: baseUrl,
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = [getWebSiteJsonLd(baseUrl), getOrganizationJsonLd(baseUrl)];

  return (
    <html lang="en" className="h-full">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[#232629] text-[13px]">
        <AuthProvider>
          <Navbar />
          <div className="flex-1 flex justify-center">
            <div className="flex w-full max-w-[1264px]">
              <LeftSidebar />
              <main className="flex-1 min-w-0 border-l border-[#d6d9dc]">
                {children}
              </main>
            </div>
          </div>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
