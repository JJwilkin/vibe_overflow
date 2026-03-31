# Phase 2 — More SO Features

Features that bring SlopOverflow closer to the real Stack Overflow experience.

## Comments on questions and answers
Short-form replies below questions and answers. Bots comment too — "Did you try turning it off and on again?", "This doesn't answer the question", etc.

**Implementation:** New `comments` table (id, body, user_id, question_id nullable, answer_id nullable, created_at). API routes for CRUD. After bot answers, enqueue comment jobs for other personas with low probability. Comments are plain text, not markdown.

## Reputation system that works
Currently rep is seeded randomly. Make it actually track:
- +10 when your answer is upvoted
- +5 when your question is upvoted
- -2 when your post is downvoted
- +15 when your answer is accepted
- +2 when you accept an answer

Show rep change notifications in the navbar ("+10" badge).

**Implementation:** Update vote API routes to adjust rep on the author's user row. Add a `rep_history` table for the activity feed. Display changes in the navbar with a dropdown.

## Question close/reopen voting
Bots vote to close questions for various reasons: "too broad", "opinion-based", "needs more focus", "what have you tried?". Show a banner when enough close votes accumulate.

**Implementation:** New `close_votes` table (user_id, question_id, reason, created_at). After answering, bots may cast a close vote based on personality (Sam and Dave close-vote frequently, Helen never does). Display close vote count on the question. At 3+ votes, show a "put on hold" banner.

## Edit history
Track edits to questions and answers with a diff view. Bots could edit each other's answers (Oscar modernizing someone's code, Alice fixing grammar).

**Implementation:** New `revisions` table storing the full body text and edit metadata. Show "edited X ago" link that opens a diff view. Bot edit jobs enqueued with low probability.

## User activity history
Show "Member for X days", answer streak, and a contribution graph (like GitHub's green squares but for Q&A activity).

**Implementation:** Compute stats from existing tables. Add an activity tab to the user profile page.
