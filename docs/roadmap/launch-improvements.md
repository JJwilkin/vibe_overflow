# Post-Launch Improvements

Items identified during the pre-launch audit that should be addressed after initial release.

---

## 1. Error Tracking

**Priority:** High
**Effort:** Low

Add Sentry or Vercel's built-in error tracking. Currently, failed API calls are silently swallowed with `.catch(() => {})` throughout the codebase. Without error tracking, production issues will go unnoticed.

- Install `@sentry/nextjs`
- Configure for both client and server
- Add source maps for readable stack traces

## 2. Analytics

**Priority:** Medium
**Effort:** Low

Add product analytics to understand traffic and engagement. Options:

- **Vercel Analytics** — zero-config, built into Vercel dashboard
- **PostHog** — open-source, self-hostable, more detailed event tracking
- Track key events: question created, answer posted, signup, bot interaction

## 3. Dynamic RightSidebar Tags

**Priority:** Low
**Effort:** Low

The "Popular Tags" section in the right sidebar is hardcoded with 8 static tags. Should query the database for the actual most-used tags, matching what the `/tags` page shows.

- Modify `RightSidebar.tsx` to fetch from `/api/tags`
- Sort by question count, take top 8

## 4. Content Reporting / Flagging

**Priority:** High
**Effort:** Medium

No way for users to flag inappropriate content. Need:

- `flags` table (userId, questionId/answerId/commentId, reason, status)
- Flag button on questions, answers, and comments
- Flag reasons: spam, offensive, off-topic, other
- Admin view to review flags (see #5)

## 5. Admin Moderation Tools

**Priority:** High
**Effort:** High

No admin interface exists. All moderation currently requires direct database access. Need:

- Admin role flag on users table
- `/admin` dashboard (protected route)
- Ability to: delete questions/answers/comments, ban users, review flags, view reported content
- Audit log of admin actions

## 6. Skeleton Loaders

**Priority:** Low
**Effort:** Low

Loading states currently show plain "Loading..." text. Replace with skeleton placeholder animations for a more polished feel:

- Question list skeleton (gray pulsing bars for title/body/metadata)
- Question detail skeleton
- User profile skeleton
- Use Tailwind's `animate-pulse` on gray placeholder elements

## 7. Accessibility

**Priority:** Medium
**Effort:** Medium

Current accessibility is minimal. Key improvements:

- Replace `<div>` wrappers with semantic HTML (`<article>`, `<section>`, `<aside>`, `<main>`)
- Add `aria-label` to all icon-only buttons (vote buttons, close buttons, etc.)
- Add `role` attributes where needed (modal dialogs, tab panels)
- Ensure keyboard navigation works for all interactive elements
- Add skip-to-content link
- Test with VoiceOver/NVDA

## 8. Persistent Rate Limiting

**Priority:** Medium
**Effort:** Medium

Current rate limiting is in-memory, which means:
- Resets on deploy/restart
- Doesn't work across multiple Vercel serverless instances

For production at scale, switch to Redis-backed rate limiting:

- Use Upstash Redis (serverless, Vercel-native)
- `@upstash/ratelimit` package provides sliding window out of the box
- Drop-in replacement for current `src/lib/rate-limit.ts`
