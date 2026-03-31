import { Persona } from "./personas";

interface Question {
  title: string;
  body: string;
}

interface Answer {
  body: string;
  userName: string;
}

/**
 * Generate a response using either Groq (OpenAI-compatible) or Ollama.
 * If GROQ_API_KEY is set, uses Groq. Otherwise falls back to local Ollama.
 */
export async function generateResponse(
  persona: Persona,
  question: Question,
  existingAnswers: Answer[]
): Promise<string> {
  const prompt = buildPrompt(persona, question, existingAnswers);
  return callLLM(persona.systemPrompt, prompt);
}

/**
 * Lower-level LLM call used by both answer generation and comment generation.
 */
export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey) {
    return callGroq(groqKey, systemPrompt, userPrompt, options);
  }
  return callOllama(systemPrompt, userPrompt, options);
}

async function callGroq(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const model = process.env.LLM_MODEL || "llama-3.1-8b-instant";
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: options.temperature ?? 0.8,
        max_tokens: options.maxTokens ?? 1024,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || "";
    }

    if (response.status === 429) {
      const text = await response.text();
      // Parse retry-after from the error message
      const retryMatch = text.match(/try again in ([\d.]+)s/);
      const waitSec = retryMatch ? parseFloat(retryMatch[1]) + 1 : (attempt + 1) * 8;
      console.log(`  ⏳ Rate limited, waiting ${waitSec.toFixed(1)}s (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      continue;
    }

    const text = await response.text();
    throw new Error(`Groq error: ${response.status} ${text}`);
  }

  throw new Error("Groq rate limit: max retries exceeded");
}

async function callOllama(
  systemPrompt: string,
  userPrompt: string,
  options: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "mistral";

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: userPrompt,
      system: systemPrompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.8,
        num_predict: options.maxTokens ?? 1024,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.response?.trim() || "";
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
