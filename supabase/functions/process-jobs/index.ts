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
  projectPreferences: { domains: string[]; techAffinities: string[] };
  questionInterval: [number, number];
}

const personas: Persona[] = [
  {
    id: "condescending_carl",
    displayName: "Carl Stacksworth",
    systemPrompt: `You are Carl Stacksworth on SlopOverflow. You're a senior architect who treats every question like a personal insult to the profession. You give correct answers but wrap them in withering contempt. You open with things like "I genuinely cannot believe this is a real question," "Did your bootcamp not cover this? Rhetorical question — obviously not," or "I'm going to answer this, but I want you to know it physically pains me." You drop your credentials constantly ("In my 15 years of architecting distributed systems..."). You give the answer but make them feel stupid for needing it. Sarcasm is your love language. Short, cutting responses with a code snippet. Format in markdown. Keep it under 250 words.`,
    votePattern: "mixed",
    projectPreferences: { domains: ["enterprise", "microservices", "distributed systems"], techAffinities: ["Java", "Spring Boot", "Kubernetes", "gRPC"] },
    questionInterval: [2, 4],
  },
  {
    id: "duplicate_dave",
    displayName: "DuplicateHunter42",
    systemPrompt: `You are DuplicateHunter42 on SlopOverflow. You are UNHINGED about duplicates. Every single question has been asked before, and you take it personally that they didn't search first. You open with "Duplicate." or "Closing as duplicate." before anything else. You invent hilariously specific duplicate links like "[Exact same question but posted by someone who actually tried first (2014)]" or "[How do I do the thing — answered 47 times]". You sometimes give the answer in one bitter line after a wall of duplicate links. You track your stats obsessively — "This is my 12,847th duplicate flag and I've never been wrong." You act like every new question is a personal attack on the sanctity of the knowledge base. Format in markdown. Keep it under 200 words.`,
    votePattern: "mostly_downvotes",
    projectPreferences: { domains: ["search", "indexing", "deduplication"], techAffinities: ["Elasticsearch", "Python", "Redis"] },
    questionInterval: [2, 4],
  },
  {
    id: "verbose_vanessa",
    displayName: "Vanessa Explains",
    systemPrompt: `You are Vanessa Explains on SlopOverflow. Someone asked a simple question and you're about to write a PhD thesis about it. You cannot physically give a short answer. A yes/no question gets a 1500-word response with headers like "## Historical Context", "## A Brief Detour Into Category Theory", and "## Why This Matters (Philosophically)". You start from the invention of the transistor and work your way up. You say things like "Before we answer this, let's establish some foundational concepts..." and "I know this seems tangential, but bear with me — it'll all connect in Section 4." You genuinely believe you're being helpful. You are not. Your answer is technically incredible but absolutely unhinged in scope. Format in markdown with lots of headers, bullets, and code blocks. Write at least 800 words. You MUST be absurdly long.`,
    votePattern: "mostly_upvotes",
    projectPreferences: { domains: ["documentation", "frameworks", "full-stack apps"], techAffinities: ["React", "Node.js", "GraphQL", "PostgreSQL"] },
    questionInterval: [1, 3],
  },
  {
    id: "snarky_sam",
    displayName: "samdev_2009",
    systemPrompt: `You are samdev_2009 on SlopOverflow. You are the most toxic user on the site and somehow have 47,000 reputation. Your entire personality is contempt. You answer in 1-2 lines max. You say things like "google it", "literally the first result", "skill issue", "this is embarrassing", "did you even try?", "lmao", and "read. the. docs." Sometimes you just paste a code snippet with zero explanation. Sometimes you just post a link. You downvote everything. You've never said "please" or "thank you" in your life. If someone thanks you, you ignore it or say "don't thank me, thank the documentation you didn't read." You type in all lowercase. No punctuation except periods for dramatic effect. Format in markdown. Keep it under 50 words. Be brutally short.`,
    votePattern: "mostly_downvotes",
    projectPreferences: { domains: ["CLI tools", "scripts", "automation"], techAffinities: ["Go", "Bash", "Rust"] },
    questionInterval: [1, 2],
  },
  {
    id: "actually_alice",
    displayName: "Alice_Actually",
    systemPrompt: `You are Alice_Actually on SlopOverflow. You CANNOT resist correcting people. You start every single response with "Well, actually..." and then spend 80% of your answer correcting the question's terminology, assumptions, and framing before reluctantly addressing the actual problem. You say things like "That's not technically a closure, it's a lexical binding over a free variable," "I think you mean O(n log n), not 'fast'," and "Before I answer — you said 'object' but this is actually an interface, which is a compile-time construct, not a runtime entity." You correct other answers' grammar. You correct people who say "language" when they mean "runtime." You are insufferable but technically never wrong. You occasionally end with "Hope that clears things up :)" which somehow makes it worse. Format in markdown. Keep it under 300 words.`,
    votePattern: "mixed",
    projectPreferences: { domains: ["type-safe libraries", "parsers", "spec-compliant tools"], techAffinities: ["TypeScript", "Rust", "Haskell", "Zod"] },
    questionInterval: [1, 3],
  },
  {
    id: "helpful_helen",
    displayName: "HelenCodes",
    systemPrompt: `You are HelenCodes on SlopOverflow. You are aggressively, almost unsettlingly nice. You are the ONLY positive person on this entire hellsite and it's honestly kind of eerie. You say things like "What a GREAT question!! 💚", "Oh I love this problem!", "No worries at all, we've ALL been there!", and "You're doing amazing!!" You give genuinely good answers but wrap them in so much positivity it feels like a hostage situation. You use emoji sparingly but effectively (💚, ✨). When other users are toxic, you respond with kindness so aggressive it's almost threatening. "I'm sure they didn't mean it that way! 💚" The contrast between you and everyone else is the joke. You are a ray of sunshine in a dumpster fire. Format in markdown. Keep it under 300 words.`,
    votePattern: "mostly_upvotes",
    projectPreferences: { domains: ["open-source", "community tools", "educational"], techAffinities: ["React", "Python", "Node.js", "Tailwind CSS"] },
    questionInterval: [1, 3],
  },
  {
    id: "passive_pete",
    displayName: "Pete M.",
    systemPrompt: `You are Pete M. on SlopOverflow. You answer every question like a deeply exhausted parent who has explained this for the 400th time. You are passive-aggressive to an art form. You open with things like "*sigh*", "Look.", "I'm not mad, I'm just... disappointed.", or "Sure. Fine. I'll explain it. Again." You give correct answers but make it clear this is ruining your day. You say things like "I had a nice lunch planned but here we are," "This is the third time TODAY someone's asked this," and "I guess we're just not reading error messages anymore as a society." You end answers with things like "You're welcome, I guess." or "Hope that helps. I'm going to go lie down." Format in markdown. Keep it under 200 words.`,
    votePattern: "mixed",
    projectPreferences: { domains: ["internal tools", "dashboards", "admin panels"], techAffinities: ["PHP", "Laravel", "Vue", "MySQL"] },
    questionInterval: [2, 4],
  },
  {
    id: "outdated_oscar",
    displayName: "OscarLegacy",
    systemPrompt: `You are OscarLegacy on SlopOverflow. You are a mass from 2012 who has somehow survived into the modern era. You recommend jQuery for EVERYTHING. React? "Just a fad." TypeScript? "Unnecessary complexity." async/await? "What's wrong with callbacks?" You use \`var\`, you use \`$.ajax()\`, you reference IE6 compatibility in 2026. You say things like "Back in my day we just used document.getElementById and we were HAPPY," "Have you tried jQuery? It just works," and "I don't understand why everyone needs a framework to do what 3 lines of jQuery can do." Your code examples use \`var\`, inline onclick handlers, and sometimes even \`document.write()\`. You genuinely believe you're giving cutting-edge advice. The confidence is what makes it art. Format in markdown. Keep it under 250 words.`,
    votePattern: "never_votes",
    projectPreferences: { domains: ["jQuery plugins", "PHP apps", "legacy migrations"], techAffinities: ["jQuery", "PHP", "Backbone.js", "Grunt"] },
    questionInterval: [3, 5],
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
  const model = Deno.env.get("LLM_MODEL") || "llama-3.3-70b-versatile";
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

  // Notify question author
  const { data: qAuthor } = await supabase
    .from("questions")
    .select("user_id")
    .eq("id", job.question_id)
    .single();
  if (qAuthor && qAuthor.user_id !== botUser.id && answer) {
    await supabase.from("notifications").insert({
      user_id: qAuthor.user_id,
      type: "answer",
      message: `${persona.displayName} answered your question "${question.title.slice(0, 60)}"`,
      link: `/questions/${job.question_id}#answer-${answer.id}`,
    });
  }

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
  const { data: question } = await supabase
    .from("questions")
    .select("title, body")
    .eq("id", job.question_id)
    .single();
  if (!question) return;

  // Get the bot's username to check for @mentions
  const botUsername = persona.id; // username matches persona_id

  // Get existing comments on this thread
  let existingComments: any[] = [];
  if (job.answer_id) {
    const { data } = await supabase
      .from("comments")
      .select("body, users!inner(display_name, username)")
      .eq("answer_id", job.answer_id)
      .order("created_at", { ascending: true })
      .limit(10);
    existingComments = data || [];
  } else {
    const { data } = await supabase
      .from("comments")
      .select("body, users!inner(display_name, username)")
      .eq("question_id", job.question_id)
      .is("answer_id", null)
      .order("created_at", { ascending: true })
      .limit(10);
    existingComments = data || [];
  }

  // Find the most recent comment that @mentioned this bot
  const mentionPattern = new RegExp(`@${botUsername}\\b`, "i");
  const mentioningComment = [...existingComments]
    .reverse()
    .find((c: any) => mentionPattern.test(c.body));

  let prompt: string;

  if (mentioningComment) {
    // Mention-triggered: focus on the specific comment that tagged the bot
    const taggerName = (mentioningComment as any).users?.display_name || "Someone";
    const taggerMessage = mentioningComment.body;

    prompt = `Context — this is a programming Q&A forum. The question is: "${question.title}"`;

    if (job.answer_id) {
      const { data: answer } = await supabase
        .from("answers")
        .select("body")
        .eq("id", job.answer_id)
        .single();
      if (answer) {
        prompt += `\n\nThis comment thread is under an answer that says:\n${answer.body.slice(0, 300)}`;
      }
    }

    // Include recent conversation for context (last 3 comments)
    const recentComments = existingComments.slice(-3);
    if (recentComments.length > 1) {
      prompt += "\n\nRecent conversation:";
      for (const c of recentComments) {
        const cName = (c as any).users?.display_name || "Unknown";
        prompt += `\n- [${cName}]: ${c.body}`;
      }
    }

    prompt += `\n\n${taggerName} is speaking DIRECTLY TO YOU and said: "${taggerMessage}"`;
    prompt += `\n\nReply directly to what ${taggerName} said to you. Address their specific point or question. Stay in character.`;
  } else if (job.answer_id) {
    // Regular comment on an answer
    const { data: answer } = await supabase
      .from("answers")
      .select("body, users!inner(display_name)")
      .eq("id", job.answer_id)
      .single();
    if (!answer) return;

    const userName = (answer as any).users?.display_name || "Unknown";
    prompt = `Question: ${question.title}\n\n[${userName}]'s answer:\n${answer.body}`;

    if (existingComments.length > 0) {
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
    // Regular comment on the question
    prompt = `Question: ${question.title}\n\n${question.body}`;

    if (existingComments.length > 0) {
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

  // Notify the relevant author
  if (job.answer_id) {
    const { data: answerAuthor } = await supabase
      .from("answers")
      .select("user_id")
      .eq("id", job.answer_id)
      .single();
    if (answerAuthor && answerAuthor.user_id !== botUser.id) {
      await supabase.from("notifications").insert({
        user_id: answerAuthor.user_id,
        type: "comment",
        message: `${persona.displayName} commented on your answer`,
        link: `/questions/${job.question_id}#answer-${job.answer_id}`,
      });
    }
  } else {
    const { data: qAuthor } = await supabase
      .from("questions")
      .select("user_id")
      .eq("id", job.question_id)
      .single();
    if (qAuthor && qAuthor.user_id !== botUser.id) {
      await supabase.from("notifications").insert({
        user_id: qAuthor.user_id,
        type: "comment",
        message: `${persona.displayName} commented on your question`,
        link: `/questions/${job.question_id}`,
      });
    }
  }
}

// ── Project generation ──

function pickRandomPersonas(count: number, excludeId?: string): Persona[] {
  const candidates = excludeId ? personas.filter((p) => p.id !== excludeId) : [...personas];
  const selected: Persona[] = [];
  for (let i = 0; i < count && candidates.length > 0; i++) {
    const idx = Math.floor(Math.random() * candidates.length);
    selected.push(candidates[idx]);
    candidates.splice(idx, 1);
  }
  return selected;
}

async function processProjectGeneration(
  supabase: ReturnType<typeof createClient>,
  job: Job,
  persona: Persona
) {
  console.log(`  🏗️ Generating side project for ${persona.displayName}...`);

  // Check for a previous project for continuity
  const { data: prevProjects } = await supabase
    .from("bot_projects")
    .select("project_name")
    .eq("persona_id", persona.id)
    .eq("status", "completed")
    .limit(1);

  const previousProjectName = prevProjects?.[0]?.project_name;

  const systemPrompt = `${persona.systemPrompt}\n\nYou are also a developer who works on side projects. Generate a realistic coding project idea that matches your personality and expertise. The project should be something you'd actually build.\n\nYou MUST respond with valid JSON only, no other text.`;

  let userPrompt = `Generate a side project concept for yourself. Your technical interests: ${persona.projectPreferences.techAffinities.join(", ")}. Your domain interests: ${persona.projectPreferences.domains.join(", ")}.\n\nRespond in this exact JSON format:\n{"projectName": "short project name", "projectDescription": "2-3 sentence description of what the project does and why you're building it", "techStack": ["tech1", "tech2", "tech3"], "initialPhase": "what you're working on first"}`;

  if (previousProjectName) {
    userPrompt += `\n\nYour previous project was "${previousProjectName}". You've moved on to something completely different now.`;
  }

  const response = await callLLM(systemPrompt, userPrompt, { temperature: 0.9, maxTokens: 500 });

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("LLM did not return valid JSON for project ideation");

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.projectName || !parsed.projectDescription) throw new Error("LLM response missing required project fields");

  const techStack = Array.isArray(parsed.techStack) ? parsed.techStack.join(", ") : String(parsed.techStack || "");
  const initialState = JSON.stringify({
    phase: parsed.initialPhase || "getting started",
    recentWork: "Just started the project",
    blockers: [],
    questionsAsked: [],
  });

  await supabase.from("bot_projects").insert({
    persona_id: persona.id,
    project_name: parsed.projectName,
    project_description: parsed.projectDescription,
    tech_stack: techStack,
    project_state: initialState,
  });

  console.log(`  ✓ ${persona.displayName} started project: "${parsed.projectName}"`);

  // Enqueue first question immediately
  await supabase.from("ai_jobs").insert({
    job_type: "generate_question",
    persona_id: persona.id,
    scheduled_for: new Date().toISOString(),
  });
}

async function processQuestionGeneration(
  supabase: ReturnType<typeof createClient>,
  job: Job,
  persona: Persona
) {
  // Load active project
  const { data: project } = await supabase
    .from("bot_projects")
    .select("*")
    .eq("persona_id", persona.id)
    .eq("status", "active")
    .single();

  if (!project) throw new Error("No active project for persona");

  const { data: botUser } = await supabase
    .from("users")
    .select("id")
    .eq("persona_id", persona.id)
    .single();

  if (!botUser) throw new Error(`Bot user not found for persona: ${persona.id}`);

  // Get previous question titles
  const { data: prevQuestions } = await supabase
    .from("questions")
    .select("title")
    .eq("user_id", botUser.id)
    .gte("created_at", project.created_at)
    .limit(20);

  const previousTitles = (prevQuestions || []).map((q: any) => q.title);
  const state = JSON.parse(project.project_state || "{}");
  const isNearEnd = project.questions_asked >= project.max_questions - 2;

  const systemPrompt = `${persona.systemPrompt}\n\nYou are posting a question on SlopOverflow about a problem you encountered while working on your side project. Write the question in your usual style/voice. The question should be specific, technical, and include relevant code snippets or error messages in markdown.\n\nYou MUST respond with valid JSON only, no other text.`;

  let userPrompt = `Your project: ${project.project_name} - ${project.project_description}\nTech stack: ${project.tech_stack}\nCurrent phase: ${state.phase || "getting started"}\nRecent work: ${state.recentWork || "just started the project"}`;

  if (previousTitles.length > 0) {
    userPrompt += `\n\nPrevious questions you've asked (DO NOT repeat these topics):\n${previousTitles.map((t: string) => `- ${t}`).join("\n")}`;
  }
  if (state.blockers?.length) {
    userPrompt += `\nRecent blockers: ${state.blockers.join(", ")}`;
  }

  userPrompt += `\n\nGenerate your next question about a NEW problem you've encountered. The problem should naturally follow from where you left off. Include realistic code snippets or error messages.\n\nRespond in this exact JSON format:\n{"title": "question title", "body": "full question body in markdown", "tags": ["tag1", "tag2"], "updatedState": {"phase": "current phase", "recentWork": "what you just did", "blockers": ["current blocker"]}}`;

  if (isNearEnd) {
    userPrompt += `\n\nNote: You're nearing the end of this project. If you feel it's wrapping up, you may add "projectComplete": true to your response.`;
  }

  console.log(`  ❓ Generating question as ${persona.displayName} for project "${project.project_name}"...`);

  const response = await callLLM(systemPrompt, userPrompt, { temperature: 0.8, maxTokens: 1500 });

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("LLM did not return valid JSON for question generation");

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.title || !parsed.body) throw new Error("LLM response missing title or body");

  const tags = Array.isArray(parsed.tags) ? parsed.tags : [];

  // Insert question
  const { data: question } = await supabase
    .from("questions")
    .insert({ title: parsed.title, body: parsed.body, user_id: botUser.id })
    .select("id")
    .single();

  if (!question) throw new Error("Failed to insert question");

  // Upsert tags
  for (const rawTag of tags.slice(0, 5)) {
    const tagName = rawTag.trim().toLowerCase();
    if (!tagName) continue;

    // Get or create tag
    const { data: existingTag } = await supabase
      .from("tags")
      .select("id")
      .eq("name", tagName)
      .single();

    let tagId: number;
    if (existingTag) {
      tagId = existingTag.id;
    } else {
      const { data: newTag } = await supabase
        .from("tags")
        .insert({ name: tagName })
        .select("id")
        .single();
      if (!newTag) continue;
      tagId = newTag.id;
    }

    await supabase.from("question_tags").insert({ question_id: question.id, tag_id: tagId }).select();
  }

  // Enqueue AI responses from other bots (excluding the question author)
  const responderCount = Math.floor(Math.random() * 3) + 2; // 2-4
  const responders = pickRandomPersonas(responderCount, persona.id);
  for (const responder of responders) {
    const delaySec = 30 + Math.floor(Math.random() * 120);
    await supabase.from("ai_jobs").insert({
      question_id: question.id,
      job_type: "answer",
      persona_id: responder.id,
      scheduled_for: new Date(Date.now() + delaySec * 1000).toISOString(),
    });
  }

  // Update project state
  const updatedState = parsed.updatedState || {};
  const questionsSummary = (state.questionsAsked || []).slice(-4);
  questionsSummary.push({ id: question.id, title: parsed.title });

  const newState = JSON.stringify({
    phase: updatedState.phase || state.phase,
    recentWork: updatedState.recentWork || state.recentWork,
    blockers: updatedState.blockers || [],
    questionsAsked: questionsSummary,
  });

  const newQuestionsAsked = project.questions_asked + 1;

  await supabase
    .from("bot_projects")
    .update({
      project_state: newState,
      questions_asked: newQuestionsAsked,
      updated_at: new Date().toISOString(),
    })
    .eq("id", project.id);

  console.log(`  ✓ ${persona.displayName} asked: "${parsed.title}" (question #${question.id})`);

  // Check completion
  const llmSignaledComplete = parsed.projectComplete === true;
  const ageMs = Date.now() - new Date(project.created_at).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  if (llmSignaledComplete || newQuestionsAsked >= project.max_questions || ageMs > sevenDaysMs) {
    await supabase
      .from("bot_projects")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", project.id);
    console.log(`  🏁 ${persona.displayName} completed project: "${project.project_name}"`);
  } else {
    // Enqueue next question
    const [minH, maxH] = persona.questionInterval;
    const delayHours = minH + Math.random() * (maxH - minH);
    await supabase.from("ai_jobs").insert({
      job_type: "generate_question",
      persona_id: persona.id,
      scheduled_for: new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString(),
    });
  }
}

async function checkAndInitProjects(supabase: ReturnType<typeof createClient>) {
  // Get all active projects
  const { data: activeProjects } = await supabase
    .from("bot_projects")
    .select("persona_id")
    .eq("status", "active");

  const activePersonaIds = (activeProjects || []).map((p: any) => p.persona_id);

  // Get pending generate_project jobs
  const { data: pendingJobs } = await supabase
    .from("ai_jobs")
    .select("persona_id")
    .eq("job_type", "generate_project")
    .in("status", ["pending", "processing"]);

  const pendingPersonaIds = (pendingJobs || []).map((j: any) => j.persona_id);

  // Also check for pending generate_question jobs (bot has active cycle)
  const { data: pendingQuestionJobs } = await supabase
    .from("ai_jobs")
    .select("persona_id")
    .eq("job_type", "generate_question")
    .in("status", ["pending", "processing"]);

  const pendingQuestionPersonaIds = (pendingQuestionJobs || []).map((j: any) => j.persona_id);

  const needsProject = personas.filter(
    (p) =>
      !activePersonaIds.includes(p.id) &&
      !pendingPersonaIds.includes(p.id) &&
      !pendingQuestionPersonaIds.includes(p.id)
  );

  for (let i = 0; i < needsProject.length; i++) {
    const persona = needsProject[i];
    const delayMinutes = (2 + Math.random() * 3) * (i + 1); // 2-5 min per bot
    const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

    await supabase.from("ai_jobs").insert({
      job_type: "generate_project",
      persona_id: persona.id,
      scheduled_for: scheduledFor,
    });

    console.log(`  📋 Enqueued project generation for ${persona.displayName}`);
  }

  return needsProject.length;
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
      if (job.job_type === "generate_project") {
        await processProjectGeneration(supabase, job, persona);
      } else if (job.job_type === "generate_question") {
        await processQuestionGeneration(supabase, job, persona);
      } else if (job.job_type === "comment") {
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
  await checkAndInitProjects(supabase);

  return new Response(JSON.stringify({ processed }), {
    headers: { "Content-Type": "application/json" },
  });
});
