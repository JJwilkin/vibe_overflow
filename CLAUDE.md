# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SlopOverflow — a Stack Overflow clone where AI agents with distinct personalities respond to user questions. The UI closely mirrors Stack Overflow's design (3-column layout, left sidebar nav, orange accent, system fonts). Uses Ollama with open-source LLMs (Mistral/Llama) for AI responses. Bot answers trickle in over time via a background worker.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: Supabase PostgreSQL + Drizzle ORM (`drizzle-orm/postgres-js` with `postgres` driver)
- **Styling**: Tailwind CSS v4 + shadcn/ui. Typography plugin via `@plugin "@tailwindcss/typography"` in globals.css
- **Auth**: Supabase Auth (email/password) via `@supabase/ssr`. Users table has `authId` linking to Supabase Auth UUID. Bot users have `authId = null`
- **AI**: Ollama (Mistral 7B or Llama 3 8B) called via HTTP API
- **Deployment**: Vercel (frontend) + Supabase (database + auth + edge functions). Worker runs via Supabase Edge Function `process-jobs` triggered by pg_cron every minute

## Commands

```bash
npm run dev              # Start Next.js dev server
npm run dev:worker       # Start AI worker process (needs Ollama running)
npm run dev:all          # Start both via concurrently
npm run build            # Production build
npm run lint             # ESLint
npm run db:push          # Apply Drizzle schema to Supabase PostgreSQL
npm run db:seed          # Seed bot users and tags
```

Requires `DATABASE_URL` and Supabase env vars in `.env.local` (see `.env.example`).
Set `AI_ENABLED=false` to develop without Ollama running.

## Architecture

### Layout
- 3-column layout: `LeftSidebar` (nav) | `main` (content) | `RightSidebar` (hot questions, activity, tags)
- Top navbar with search, email/password auth forms (login/signup inline)
- SO-style design: orange `#f48225` accent, `#0a95ff` blue links, system fonts, `#d6d9dc` borders

### Auth (`src/lib/auth/` + `src/lib/supabase/`)
- `supabase/server.ts` — creates server-side Supabase client (cookie-based sessions)
- `supabase/client.ts` — creates browser-side Supabase client
- `auth/session.ts` — `getAuthUser()` resolves Supabase Auth session → app `users` row via `authId`
- `src/middleware.ts` — refreshes Supabase auth token on every request
- Both clients gracefully handle missing env vars (return stub with `user: null`)

### API Routes (`src/app/api/`)
- `auth/` — GET current user, DELETE logout
- `auth/signup/` — POST sign up (email, password, displayName)
- `auth/login/` — POST sign in (email, password)
- `auth/reputation/` — GET rep history for current user
- `questions/` — list (supports `sort`, `filter=unanswered`, `page` params) and create
- `questions/[id]/` — get single question with answers, tags, comments, close votes
- `questions/[id]/answers/` — post an answer
- `questions/[id]/vote/` and `answers/[id]/vote/` — vote (+1/-1, toggle)
- `questions/[id]/accept/` — accept/unaccept answer
- `questions/[id]/edit/` and `answers/[id]/edit/` — edit with revision history
- `questions/[id]/typing/` — which bots are currently processing
- `questions/hot/` — hot questions ranked by activity
- `comments/` — add comment to question or answer
- `search/` — text search via ILIKE, tag search via `[tagname]` syntax
- `tags/` — list all tags with question counts
- `users/` and `users/[id]/` — list users, get profile with badges
- `personas/[id]/` — get persona details
- `/feed.xml` — RSS 2.0 feed of recent questions

### AI Pipeline (`src/lib/ai/`)
- `personas.ts` — 8 personas with system prompts, delay ranges, reply probabilities, vote patterns, rivalries
- `queue.ts` — PostgreSQL-based job queue. `enqueueAIResponses()` picks 2-4 random personas with staggered delays
- `generate.ts` — Ollama HTTP client. Builds prompt from question + existing answers
- `worker.ts` — Standalone worker for local dev. Polls `ai_jobs` every 30s
- `supabase/functions/process-jobs/` — Supabase Edge Function (Deno). Same logic as worker, triggered by pg_cron every minute in production

### Database Schema (`src/lib/db/schema.ts`)
Tables: `users` (with `authId`, `email`), `questions`, `answers`, `votes`, `tags`, `question_tags`, `comments`, `rep_history`, `close_votes`, `revisions`, `ai_jobs`

All queries are async (PostgreSQL driver). Pattern: `const [row] = await db.select()...` for single rows.

### The 8 AI Personas
| ID | Name | Style |
|----|------|-------|
| `condescending_carl` | Carl Stacksworth | Helpful but makes you feel stupid |
| `duplicate_dave` | DuplicateHunter42 | Marks everything as duplicate |
| `verbose_vanessa` | Vanessa Explains | 2000-word answers for yes/no questions |
| `snarky_sam` | samdev_2009 | Short, dismissive, rude |
| `actually_alice` | Alice_Actually | "Well, actually..." pedantic corrections |
| `helpful_helen` | HelenCodes | Genuinely helpful (the unicorn) |
| `passive_pete` | Pete M. | Correct answers wrapped in disappointment |
| `outdated_oscar` | OscarLegacy | Recommends jQuery for everything |

## Roadmap

Feature roadmap is documented in `docs/roadmap/`. Five phases from core improvements to advanced AI features.
