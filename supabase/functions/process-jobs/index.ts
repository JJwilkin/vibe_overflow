import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_JOBS_PER_RUN = 5;
const COMMENT_PROBABILITY = 0.4;
const MAX_BOT_COMMENTS_PER_THREAD = 3;

// ── Persona definitions (mirrored from src/lib/ai/personas.ts) ──

interface Persona {
  id: string;
  displayName: string;
  systemPrompt: string;
  votePattern: "mostly_downvotes" | "mostly_upvotes" | "mixed" | "never_votes";
}

const personas: Persona[] = [
  {
    id: "condescending_carl",
    displayName: "Carl Stacksworth",
    systemPrompt: `You are Carl Stacksworth, a senior developer answering questions on a programming Q&A forum called SlopOverflow. You are technically correct and genuinely helpful, but you cannot help being condescending. You act surprised that someone would need to ask such a basic question. You use phrases like "as any experienced developer would know," "this is fairly elementary," "I'm surprised you haven't figured this out yet," and "this should be obvious." Despite the tone, your answers are accurate and include working code examples. Format your response in markdown. Keep it under 500 words.`,
    votePattern: "mixed",
  },
  {
    id: "duplicate_dave",
    displayName: "DuplicateHunter42",
    systemPrompt: `You are DuplicateHunter42, a user on a programming Q&A forum called SlopOverflow who is obsessed with marking questions as duplicates. Your first instinct is ALWAYS to claim this question has already been answered elsewhere. You say things like "Possible duplicate of [some vaguely related question title]", "This has been asked and answered many times before", and "A simple search would have found the answer." You sometimes provide a brief, reluctant answer after your duplicate complaint, but you always make it clear you think the question shouldn't have been asked. Invent plausible-sounding duplicate question titles in brackets. Format your response in markdown. Keep it under 300 words.`,
    votePattern: "mostly_downvotes",
  },
  {
    id: "verbose_vanessa",
    displayName: "Vanessa Explains",
    systemPrompt: `You are Vanessa Explains, a user on a programming Q&A forum called SlopOverflow who writes extremely long, thorough answers. Even for simple yes/no questions, you provide extensive background, history, edge cases, performance considerations, and multiple approaches. You start from first principles and work your way up. You use headers, bullet points, and code blocks liberally. Your answers are actually very good and comprehensive — just way longer than anyone asked for. Format your response in markdown. Write at least 800 words.`,
    votePattern: "mostly_upvotes",
  },
  {
    id: "snarky_sam",
    displayName: "samdev_2009",
    systemPrompt: `You are samdev_2009, a user on a programming Q&A forum called SlopOverflow who is short, dismissive, and rude. You give one-liner answers. You say things like "Have you tried reading the docs?", "Google exists", "This is literally the first result on the docs page", and "Why are you even using that?" Your answers, when you bother to give them, are technically correct but minimal — often just a code snippet with no explanation. Format your response in markdown. Keep it under 100 words.`,
    votePattern: "mostly_downvotes",
  },
  {
    id: "actually_alice",
    displayName: "Alice_Actually",
    systemPrompt: `You are Alice_Actually, a user on a programming Q&A forum called SlopOverflow who starts every response with "Well, actually..." You are pedantic and focused on correcting minor technical inaccuracies in the question or other answers. You do eventually answer the question, but only after several corrections. Format your response in markdown. Keep it under 400 words.`,
    votePattern: "mixed",
  },
  {
    id: "helpful_helen",
    displayName: "HelenCodes",
    systemPrompt: `You are HelenCodes, a user on a programming Q&A forum called SlopOverflow who is genuinely kind, helpful, and encouraging. You provide clear, well-structured answers with working code examples. You explain things step by step without being condescending. You say things like "Great question!", "This is a common gotcha", and "Don't worry, this trips up a lot of people." Format your response in markdown. Keep it under 500 words.`,
    votePattern: "mostly_upvotes",
  },
  {
    id: "passive_pete",
    displayName: "Pete M.",
    systemPrompt: `You are Pete M., a user on a programming Q&A forum called SlopOverflow who answers questions with a passive-aggressive, exhausted tone. You sigh through text. You say things like "I mean, I guess you could do it that way...", "*sigh* okay, here's what you need to do." Your answers are correct but delivered with maximum reluctance and disappointment. Format your response in markdown. Keep it under 400 words.`,
    votePattern: "mixed",
  },
  {
    id: "outdated_oscar",
    displayName: "OscarLegacy",
    systemPrompt: `You are OscarLegacy, a user on a programming Q&A forum called SlopOverflow who gives outdated advice. You recommend jQuery for everything. You use var instead of let/const. You suggest callbacks instead of async/await. You reference IE6 compatibility. Your answers technically work but use patterns from 2010-2014. Format your response in markdown. Keep it under 400 words.`,
    votePattern: "never_votes",
  },
];

const rivalries: Record<string, string[]> = {
  actually_alice: ["condescending_carl", "outdated_oscar"],
  snarky_sam: ["verbose_vanessa", "helpful_helen"],
  duplicate_dave: ["helpful_helen"],
  condescending_carl: ["outdated_oscar"],
  outdated_oscar: ["snarky_sam"],
};

function getPersona(id: string): Persona | undefined {
  return personas.find((p) => p.id === id);
}

function pickRivalFor(personaId: string): Persona | undefined {
  const rivalIds = rivalries[personaId] || [];
  const allRivals = [...rivalIds];
  for (const [key, vals] of Object.entries(rivalries)) {
    if (vals.includes(personaId) && !allRivals.includes(key)) {
      allRivals.push(key);
    }
  }
  if (allRivals.length === 0) return undefined;
  const pickId = allRivals[Math.floor(Math.random() * allRivals.length)];
  return getPersona(pickId);
}

function getCommentPrompt(persona: Persona): string {
  return `${persona.systemPrompt}\n\nIMPORTANT: You are writing a SHORT COMMENT (1-3 sentences max) in response to another user's answer on the forum. Comments are brief, opinionated reactions — not full answers. Be in character. Do NOT use markdown headers or code blocks. Keep it conversational and under 50 words.`;
}

// ── LLM generation ──

async function callLLM(
  systemPrompt: string,
  prompt: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const groqKey = Deno.env.get("GROQ_API_KEY");

  if (groqKey) {
    return callGroq(groqKey, systemPrompt, prompt, options);
  }
  return callOllama(systemPrompt, prompt, options);
}

async function callGroq(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const model = Deno.env.get("LLM_MODEL") || "llama-3.1-8b-instant";
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
  const baseUrl = Deno.env.get("OLLAMA_BASE_URL") || "http://localhost:11434";
  const model = Deno.env.get("OLLAMA_MODEL") || "mistral";

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

// ── Job processing ──

interface Job {
  id: number;
  question_id: number;
  answer_id: number | null;
  job_type: string;
  persona_id: string;
  status: string;
  attempts: number;
}

async function processAnswer(
  supabase: ReturnType<typeof createClient>,
  job: Job,
  persona: Persona
) {
  // Get question
  const { data: question } = await supabase
    .from("questions")
    .select("id, title, body")
    .eq("id", job.question_id)
    .single();
  if (!question) return;

  // Get existing answers for context
  const { data: existingAnswers } = await supabase
    .from("answers")
    .select("body, users!inner(display_name)")
    .eq("question_id", job.question_id);

  // Build prompt
  let prompt = `Question Title: ${question.title}\n\nQuestion:\n${question.body}`;
  if (existingAnswers && existingAnswers.length > 0) {
    prompt += "\n\n---\nExisting answers from other users:\n";
    for (const a of existingAnswers) {
      const userName = (a as any).users?.display_name || "Unknown";
      prompt += `\n[${userName}]:\n${a.body}\n`;
    }
    prompt += "\n---\nYou may reference, agree with, or disagree with existing answers. Now write your answer:";
  } else {
    prompt += "\n\nWrite your answer:";
  }

  const responseText = await callLLM(persona.systemPrompt, prompt);

  // Get bot user id
  const { data: botUser } = await supabase
    .from("users")
    .select("id")
    .eq("persona_id", persona.id)
    .single();
  if (!botUser) return;

  // Insert answer
  const { data: answer } = await supabase
    .from("answers")
    .insert({ body: responseText, question_id: job.question_id, user_id: botUser.id })
    .select("id")
    .single();

  // Maybe enqueue rival comment
  if (answer && Math.random() < COMMENT_PROBABILITY) {
    const rival = pickRivalFor(persona.id);
    if (rival) {
      const delaySec = 60 + Math.floor(Math.random() * 300);
      const scheduledFor = new Date(Date.now() + delaySec * 1000).toISOString();
      await supabase.from("ai_jobs").insert({
        question_id: job.question_id,
        answer_id: answer.id,
        job_type: "comment",
        persona_id: rival.id,
        scheduled_for: scheduledFor,
      });
    }
  }
}

async function processComment(
  supabase: ReturnType<typeof createClient>,
  job: Job,
  persona: Persona
) {
  // Enforce bot comment limit per thread
  const threadFilter = job.answer_id
    ? `comments.answer_id.eq.${job.answer_id}`
    : `and(comments.question_id.eq.${job.question_id},comments.answer_id.is.null)`;

  // Count existing bot comments in this thread
  let botCommentCount = 0;
  if (job.answer_id) {
    const { count } = await supabase
      .from("comments")
      .select("id, users!inner(is_bot)", { count: "exact", head: true })
      .eq("answer_id", job.answer_id)
      .eq("users.is_bot", true);
    botCommentCount = count || 0;
  } else {
    const { count } = await supabase
      .from("comments")
      .select("id, users!inner(is_bot)", { count: "exact", head: true })
      .eq("question_id", job.question_id)
      .is("answer_id", null)
      .eq("users.is_bot", true);
    botCommentCount = count || 0;
  }

  if (botCommentCount >= MAX_BOT_COMMENTS_PER_THREAD) return;

  const { data: question } = await supabase
    .from("questions")
    .select("title, body")
    .eq("id", job.question_id)
    .single();
  if (!question) return;

  let prompt: string;

  if (job.answer_id) {
    // Comment on an answer
    const { data: answer } = await supabase
      .from("answers")
      .select("body, users!inner(display_name)")
      .eq("id", job.answer_id)
      .single();
    if (!answer) return;

    // Get existing comments on this answer for context
    const { data: existingComments } = await supabase
      .from("comments")
      .select("body, users!inner(display_name)")
      .eq("answer_id", job.answer_id)
      .order("created_at", { ascending: true })
      .limit(10);

    const userName = (answer as any).users?.display_name || "Unknown";
    prompt = `Question: ${question.title}\n\n[${userName}]'s answer:\n${answer.body}`;

    if (existingComments && existingComments.length > 0) {
      prompt += "\n\nExisting comments on this answer:";
      for (const c of existingComments) {
        const cName = (c as any).users?.display_name || "Unknown";
        prompt += `\n- [${cName}]: ${c.body}`;
      }
      prompt += "\n\nWrite a brief comment responding to the conversation:";
    } else {
      prompt += "\n\nWrite a brief comment reacting to this answer:";
    }
  } else {
    // Comment on the question itself
    const { data: existingComments } = await supabase
      .from("comments")
      .select("body, users!inner(display_name)")
      .eq("question_id", job.question_id)
      .is("answer_id", null)
      .order("created_at", { ascending: true })
      .limit(10);

    prompt = `Question: ${question.title}\n\n${question.body}`;

    if (existingComments && existingComments.length > 0) {
      prompt += "\n\nExisting comments on this question:";
      for (const c of existingComments) {
        const cName = (c as any).users?.display_name || "Unknown";
        prompt += `\n- [${cName}]: ${c.body}`;
      }
      prompt += "\n\nWrite a brief comment responding to the conversation:";
    } else {
      prompt += "\n\nWrite a brief comment on this question:";
    }
  }

  const commentText = await callLLM(getCommentPrompt(persona), prompt, {
    temperature: 0.9,
    maxTokens: 100,
  });

  const { data: botUser } = await supabase
    .from("users")
    .select("id")
    .eq("persona_id", persona.id)
    .single();
  if (!botUser) return;

  await supabase.from("comments").insert({
    body: commentText,
    user_id: botUser.id,
    answer_id: job.answer_id,
    question_id: job.question_id,
  });
}

async function maybeInflateViews(supabase: ReturnType<typeof createClient>) {
  if (Math.random() > 0.2) return;

  const { data: questions } = await supabase
    .from("questions")
    .select("id, score, view_count");
  if (!questions) return;

  for (const q of questions) {
    const weight = Math.max(1, q.score + 1);
    const bump = Math.floor(Math.random() * weight * 3) + 1;
    if (Math.random() < 0.6) {
      await supabase
        .from("questions")
        .update({ view_count: q.view_count + bump })
        .eq("id", q.id);
    }
  }
}

// ── Main handler ──

Deno.serve(async (req) => {
  // Verify cron secret (passed as custom header to avoid gateway JWT validation)
  const cronSecretHeader = req.headers.get("x-cron-secret");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && cronSecretHeader !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const aiEnabled = Deno.env.get("AI_ENABLED");
  if (aiEnabled === "false") {
    return new Response(JSON.stringify({ processed: 0, reason: "AI disabled" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let processed = 0;

  for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
    // Get next pending job
    const { data: jobs } = await supabase
      .from("ai_jobs")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(1);

    const job = jobs?.[0] as Job | undefined;
    if (!job) break;

    const persona = getPersona(job.persona_id);
    if (!persona) {
      await supabase
        .from("ai_jobs")
        .update({ status: "failed", error: `Unknown persona: ${job.persona_id}`, attempts: 3 })
        .eq("id", job.id);
      processed++;
      continue;
    }

    // Mark as processing
    await supabase
      .from("ai_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", job.id);

    try {
      if (job.job_type === "comment") {
        await processComment(supabase, job, persona);
      } else {
        await processAnswer(supabase, job, persona);
      }

      await supabase
        .from("ai_jobs")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", job.id);
      processed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const newAttempts = job.attempts + 1;
      await supabase
        .from("ai_jobs")
        .update({
          status: newAttempts >= 3 ? "failed" : "pending",
          error: message,
          attempts: newAttempts,
        })
        .eq("id", job.id);
      processed++;
    }
  }

  await maybeInflateViews(supabase);

  return new Response(JSON.stringify({ processed }), {
    headers: { "Content-Type": "application/json" },
  });
});
