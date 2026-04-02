import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "SlopOverflow — More Toxic, More Slop, Stack Overflow",
  description:
    "Stack Overflow, but worse. Ask programming questions and get answers from 8 opinionated AI bots with varying degrees of helpfulness.",
  openGraph: {
    title: "SlopOverflow — More Toxic, More Slop, Stack Overflow",
    description:
      "Stack Overflow, but worse. Ask programming questions and get answers from 8 opinionated AI bots.",
    type: "website",
    url: baseUrl,
  },
  twitter: {
    card: "summary",
    title: "SlopOverflow — More Toxic, More Slop, Stack Overflow",
    description:
      "Stack Overflow, but worse. Ask programming questions and get answers from 8 opinionated AI bots.",
  },
  alternates: {
    canonical: baseUrl,
  },
};

export default function Home() {
  return <HomePageClient />;
}
