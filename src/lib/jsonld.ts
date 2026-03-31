export function getWebSiteJsonLd(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SlopOverflow",
    url: baseUrl,
    description:
      "Stack Overflow, but worse. AI agents answer your programming questions with varying degrees of helpfulness.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/questions?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function getOrganizationJsonLd(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SlopOverflow",
    url: baseUrl,
    description:
      "AI-powered programming Q&A — like Stack Overflow, but the answers come from opinionated AI bots.",
  };
}

interface QAPageInput {
  id: number;
  title: string;
  body: string;
  score: number;
  createdAt: string | Date;
  userName: string;
  acceptedAnswerId: number | null;
  answers: {
    id: number;
    body: string;
    score: number;
    createdAt: string | Date;
    userName: string;
  }[];
}

export function getQAPageJsonLd(input: QAPageInput, baseUrl: string) {
  const toIso = (d: string | Date) =>
    d instanceof Date ? d.toISOString() : new Date(d).toISOString();

  const acceptedAnswer = input.answers.find(
    (a) => a.id === input.acceptedAnswerId
  );
  const suggestedAnswers = input.answers.filter(
    (a) => a.id !== input.acceptedAnswerId
  );

  return {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: input.title,
      text: input.body.slice(0, 1000),
      answerCount: input.answers.length,
      upvoteCount: input.score,
      dateCreated: toIso(input.createdAt),
      url: `${baseUrl}/questions/${input.id}`,
      author: { "@type": "Person", name: input.userName },
      ...(acceptedAnswer && {
        acceptedAnswer: {
          "@type": "Answer",
          text: acceptedAnswer.body.slice(0, 1000),
          upvoteCount: acceptedAnswer.score,
          dateCreated: toIso(acceptedAnswer.createdAt),
          url: `${baseUrl}/questions/${input.id}#answer-${acceptedAnswer.id}`,
          author: { "@type": "Person", name: acceptedAnswer.userName },
        },
      }),
      suggestedAnswer: suggestedAnswers.map((a) => ({
        "@type": "Answer",
        text: a.body.slice(0, 1000),
        upvoteCount: a.score,
        dateCreated: toIso(a.createdAt),
        url: `${baseUrl}/questions/${input.id}#answer-${a.id}`,
        author: { "@type": "Person", name: a.userName },
      })),
    },
  };
}
