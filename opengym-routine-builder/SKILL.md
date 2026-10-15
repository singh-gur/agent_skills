---
name: opengym-routine-builder
description: Interviews the user about goals, schedule, session length, equipment, experience and limitations, then builds an importable openGym (self-hosted gym tracker) plan file of routines and a weekly schedule. Use when the user wants to create, design or generate a workout routine, training plan or split for openGym from an initial idea or prompt.
compatibility: Needs an interactive way to ask the user questions (a structured choice-question tool is preferred; plain chat works). Needs network access plus git, or a local openGym checkout, to verify exercise IDs. Node is optional for a final parse check.
metadata:
  author: gurbakhshish
  spec: https://agentskills.io/specification
---

# openGym Routine Builder

Turn a rough idea ("3 days, home, dumbbells, 30 min weights + 20 min cardio") into a verified, importable openGym plan file by interviewing the user and building from their answers.

## Boundaries

- Produce a training plan only. No nutrition, supplement or medical advice. If the user reports an injury or condition, choose conservative exercises, avoid the affected area, and suggest checking with a professional.
- Never invent exercise IDs. Every ID must come from the openGym catalogue for the user's version, or from a custom exercise defined in the file.
- Never read the user's openGym backups, tokens or other personal data. Do not import the plan into their instance; hand over the file and the import steps.
- Do not write the file until the user approves the routine table.
- Do not add progression rules, warm-up sets or other advanced fields unless asked.

## Workflow

### 1. Intake

Extract from the initial prompt and conversation, and keep a short brief:

- goal (general fitness, strength, size, fat loss, conditioning) and focus areas
- days per week and which weekdays
- time per session, split between weights and cardio, and cardio-before-or-after-weights
- exact equipment, with counts (for example "one kettlebell", "no bench")
- experience level, injuries or movements to avoid
- preferences: supersets, per-side work, units (kg/lb), cardio machines and whether they should be interchangeable

### 2. Get the exercise catalogue

Ask which openGym version the user runs (Settings, or default to the latest release tag). Obtain the source at that version once and reuse it:

```bash
git clone --depth 1 --branch v<version> https://github.com/DuarteSantos8/openGym.git "${TMPDIR:-/tmp}/opengym-src"
```

Use an existing local checkout instead if the user points to one. If neither git nor network is available, say so and stop; do not guess IDs. See [references/plan-format.md](references/plan-format.md) for how to search the catalogue and for the file format.

### 3. Interview

Repeat in rounds until the brief can produce a routine with no invented choices:

- Skip anything already answered. Ask 2–4 related questions per round using the client's structured choice-question tool; fall back to numbered chat questions if none exists.
- Give concrete options with a recommended default and the consequence of each choice.
- Priorities: days and session length, equipment and limits, goal and focus areas, experience and injuries, then preferences.
- Ask follow-ups only when the answer would change the routine.
- If the user says "just build it", state the assumptions you are making and continue.
- Restate equipment limits before designing (for example: "one kettlebell, no bench, so no double-kettlebell or bench movements").

### 4. Design

- Fit the time budget. Estimate roughly 40 s of work per set plus rest; a superset round is two sets then one rest. Prefer supersets to fit 30 minutes of weights into 6 exercises.
- Allocate focus as requested (for example legs on one day only). Balance push and pull and include core when the goal is general fitness.
- Use only the stated equipment. Treat catalogue names containing bench, incline, decline, seated, preacher, rack, stability ball or bosu as likely needing gear the user may not have, and exercises whose name says "double" or "alternating" as possibly needing two bells. The catalogue has no setup instructions, so use judgement and flag any exercise whose setup you could not verify.
- For interchangeable cardio machines, use one custom cardio exercise rather than two built-in machine exercises (format in the reference).
- Leave weights blank unless the user gave loads.

### 5. Present for approval

Show a table per training day: exercise name, ID, sets x reps or seconds, rest, superset grouping, and an estimated time. Add the weekday schedule, assumptions, and any flagged exercises. Ask the user to choose: approve, revise, or answer more questions. Revise and re-present until approved.

### 6. Build and validate

Write the plan file to the current directory (or the path the user names) following the reference. Then:

1. Confirm the JSON parses and every exercise ID exists in the catalogue or in `customEx`.
2. If node is available, run `parsePlan` from the checkout as shown in the reference. `dropped` must be 0 and the counts must match the approved table.
3. Fix problems and re-check. If a fix changes the approved content, show the change first.

### 7. Hand over

Report the file path, the routines and schedule, the verification performed, and anything unverified. Give the import steps:

- Plan tab, then Share your plan, then Import a plan file, and choose whether to apply the schedule. Do not use Settings, Data & backup, Import backup: that replaces all data.
- Import adds routines and never overwrites. If an earlier version of this plan was imported, delete those routines first to avoid duplicates.
- Weights are blank and filled in at the first session.
