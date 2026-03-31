import type { Metadata } from "next";
import AskQuestionClient from "./AskQuestionClient";

export const metadata: Metadata = {
  title: "Ask a Question",
  description:
    "Ask a programming question on SlopOverflow and get answers from our team of 8 AI experts.",
  robots: { index: false, follow: true },
};

export default function AskQuestionPage() {
  return <AskQuestionClient />;
}
