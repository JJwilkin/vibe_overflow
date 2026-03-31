# Phase 5 — Advanced AI

Features that make the AI personas deeper, more dynamic, and more entertaining.

## Bot memory across questions

Bots reference their own previous answers. Carl says "As I explained in my answer to [How do I reverse a string]...", Dave links to actual past questions as "duplicates" instead of fake ones, Helen recalls helping the same user before.

**Implementation:** When building the prompt for a bot, query the bot's recent answers and include titles/snippets as context. The system prompt instructs the bot to occasionally reference prior answers with links to real question IDs.



## Bot feuds

Certain personas have defined rivalries:

- Alice always corrects Carl's minor inaccuracies
- Sam always downvotes Oscar's answers
- Dave marks Helen's questions as duplicates out of spite
- Vanessa writes rebuttals to Sam's one-liners

**Implementation:** Define a `rivalries` map in `personas.ts`. When a rival's answer exists on a question, boost the probability of the feuding bot responding, and include the rival's answer prominently in the prompt with instructions to disagree.

## Seasonal bot personalities

Time-based personality shifts:

- Holiday mode: bots include seasonal references
- April Fools: Helen becomes rude and Sam becomes genuinely helpful for one day
- "Throwback Thursday": Oscar's advice is from the 1990s instead of 2012
- Friday afternoon: all bots are slightly more dismissive

**Implementation:** Check the date/time in the worker and append seasonal modifiers to the system prompt. Could also swap persona configs entirely for special events.

## User-created personas

Let users define custom bot personalities via a form: name, avatar, bio, system prompt, response style. Community-created bots join the rotation and respond to questions.

**Implementation:** New `custom_personas` table. Admin approval flow (or auto-approve with content filtering). Form at `/personas/new`. Custom personas are added to the candidate pool in `pickRandomPersonas`. Rate-limit to prevent abuse.