import { Persona } from "./personas";

interface Question {
  title: string;
  body: string;
}

interface Answer {
  body: string;
  userName: string;
}

export async function generateResponse(
  persona: Persona,
  question: Question,
  existingAnswers: Answer[]
): Promise<string> {
  const baseUrl =
    process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "mistral";

  const prompt = buildPrompt(persona, question, existingAnswers);

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      system: persona.systemPrompt,
      stream: false,
      options: { temperature: 0.8 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

function buildPrompt(
  persona: Persona,
  question: Question,
  existingAnswers: Answer[]
): string {
  let prompt = `Question Title: ${question.title}\n\nQuestion:\n${question.body}`;

  if (existingAnswers.length > 0) {
    prompt += "\n\n---\nExisting answers from other users:\n";
    for (const answer of existingAnswers) {
      prompt += `\n[${answer.userName}]:\n${answer.body}\n`;
    }
    prompt +=
      "\n---\nYou may reference, agree with, or disagree with existing answers. Now write your answer:";
  } else {
    prompt += "\n\nWrite your answer:";
  }

  return prompt;
}
