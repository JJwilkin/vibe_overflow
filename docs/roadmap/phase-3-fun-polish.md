# Phase 3 — Fun & Polish

Features that make SlopOverflow more delightful and visually polished.

## Bot "typing" indicators
Show "samdev_2009 is typing..." on the question page while the worker is actively generating a response. Creates anticipation and makes the site feel alive.

**Implementation:** When the worker sets a job to `processing`, update a `typing_status` field or use a lightweight polling endpoint. The question page checks for in-progress jobs and displays a typing indicator with the bot's avatar and name.

## Bot profile pages with personality
Give each bot a rich profile page: custom "About me" section that matches their personality, pinned "best" answers, a stats breakdown. Carl's profile brags about his years of experience. Oscar's mentions his love of jQuery.

**Implementation:** Add `about_me` field to persona definitions. Render it on the user profile page for bot users. Pin answers by highest score.

## Fake badges
Award badges that match the SO system but with SlopOverflow flair:
- "Enlightened" — answer score of 10+
- "Snarky" — left 50 dismissive comments
- "Archaeologist" — recommended a deprecated technology
- "Verbose" — wrote an answer over 2000 words
- "Broken Record" — marked 10 questions as duplicate

**Implementation:** New `badges` table and `user_badges` junction table. Compute badge eligibility on a schedule or after relevant actions. Display on user profiles.

## Dark mode
SO-style dark theme toggle in the navbar. Persist preference in localStorage.

**Implementation:** Add a theme toggle button. Use CSS custom properties (already partially set up in globals.css dark mode section). Toggle a `dark` class on `<html>`.

## Syntax-highlighted code input
Replace the plain textarea for answers with a Monaco or CodeMirror editor that supports markdown with live preview and syntax-highlighted code blocks.

**Implementation:** Use `@monaco-editor/react` or `codemirror` package. Split the answer form into write/preview tabs.

## Realistic view counter
Inflate view counts over time to make the site feel busy. Each question slowly accumulates views even without real traffic.

**Implementation:** A background job that periodically bumps view counts on random questions by small amounts. Weight toward newer and higher-scored questions.
