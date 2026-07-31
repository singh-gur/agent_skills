---
name: spec-writer
description: Turns a raw idea into a concise, user-approved handoff brief for architecture or implementation planning. Uses a refine, research, and ask loop to clarify intent, scope, constraints, and requirements without producing an exhaustive specification. Use when an idea needs enough definition for arch-design or plan.
compatibility: Requires repository inspection when relevant, web research when external facts matter, and interactive user questions when available.
metadata:
  author: gurbakhshish
  spec: https://agentskills.io/specification
---

# Spec Writer

Turn a rough idea into a short, clear `SPECS.md` that can be handed to an architecture or planning skill. Develop the idea enough to prevent major misunderstandings, but leave architecture and implementation details to the next workflow.

## Intended handoff

The output should give `arch-design` or `plan` enough context to continue without repeating basic discovery. It is not a comprehensive product requirements document, test plan, architecture design, or implementation plan.

## Core behavior

- Keep the workflow centered on the **refine → research → ask** loop.
- Inspect available context before asking questions.
- Research only facts that could materially change scope, feasibility, constraints, or the next questions.
- Ask focused questions in small rounds; do not run a generic requirements interview.
- Preserve uncertainty as an assumption or open question instead of inventing detail.
- Prefer outcomes and externally meaningful behavior over implementation choices.
- Stop refining once the next architecture or planning skill has enough information to proceed safely.
- Present a concise confirmation brief and obtain explicit approval before writing `SPECS.md`.
- Do not design the architecture, create an implementation plan, or implement code while this skill is active.

## Brevity rules

- Default final length: **roughly 50–150 lines**. Exceed this only when the user requests more detail or the idea has materially complex constraints.
- Use bullets instead of long prose.
- Include only sections that add useful handoff context.
- Keep research notes to conclusions and source links; do not include evidence ledgers, source grading, or research transcripts.
- Do not create requirement IDs, acceptance-criterion IDs, traceability matrices, revision histories, or exhaustive edge-case catalogs by default.
- Limit requirements to the important behaviors and constraints. The downstream architecture or planning workflow can elaborate them.
- Record only risks and open questions that could affect scope, architecture, sequencing, or feasibility.

## Workflow

### 1. Refine

Read the raw request and relevant supplied or repository context. Produce a compact working summary:

- problem or opportunity
- desired outcome
- intended users or stakeholders
- initial in-scope and out-of-scope boundaries
- known constraints
- important unknowns
- intended next handoff: architecture, simple plan, or complex plan

Do not ask questions that repository files or supplied material can answer.

### 2. Research

Research the important unknowns before asking the user to decide them.

Use repository inspection for current behavior, interfaces, conventions, and constraints. Use current external sources for APIs, standards, regulations, versions, limits, or ecosystem facts. Delegate research only when it materially improves speed or confidence; subagents are optional, not mandatory.

Keep research proportional:

- use one focused research pass for most ideas
- use parallel tracks only when there are genuinely independent unknowns
- prefer primary or official sources
- stop when further research is unlikely to change the brief or questions
- retain concise source links only for claims the next workflow may need to verify

### 3. Ask

Ask a small round of high-impact questions based on the refined idea and research.

- Ask only about decisions the user is best placed to make.
- Prefer 2–5 questions per round and never exceed 7.
- Use choices with a recommendation when trade-offs are understood.
- Prioritize outcome, users, scope boundaries, critical behavior, constraints, and success signals.
- Ask about security, privacy, reliability, scale, compatibility, or rollout only when relevant.
- Summarize the answers and update the working brief.

### 4. Repeat only as needed

Repeat **refine → research → ask** when an answer introduces a material unknown or changes the scope. Do not repeat the loop for minor wording or details that the downstream workflow can resolve.

The brief is ready when it clearly answers:

- What problem are we solving, for whom, and why?
- What outcome and essential behavior are expected?
- What is in scope and explicitly out of scope?
- What constraints or existing-system facts shape the work?
- What would indicate success?
- Which assumptions, risks, or open decisions must the next workflow consider?

### 5. Confirm

Present a concise confirmation brief containing:

- problem and desired outcome
- users
- scope and non-goals
- essential requirements
- constraints and relevant researched facts
- success signals
- assumptions, risks, and open questions
- intended next skill
- proposed output path

Ask the user to choose one:

- **Approve and write `SPECS.md`**
- **Revise**
- **Answer remaining questions**
- **Cancel**

Approval must be explicit. If the user requests changes, update the brief and confirm again. Do not write the file before approval.

### 6. Write the handoff brief

Default to `SPECS.md` at the repository root unless the user chooses another path or the repository has a clear convention. Read an existing target before replacing it and summarize material changes during confirmation.

Use `templates/SPECS.template.md` as a flexible guide, not a mandatory form. Omit empty or irrelevant sections. Keep the document concise and use direct language.

## Minimum content

A useful final brief normally includes:

- summary
- problem and desired outcome
- users
- scope and non-goals
- essential requirements
- constraints and dependencies
- success signals
- assumptions, risks, and open questions
- research links when external facts materially influenced the brief
- recommended next step

Acceptance examples may be included when they clarify ambiguous behavior, but exhaustive acceptance criteria belong in the downstream plan or other dedicated workflow.

## Completion check

Before writing, verify that:

- the user explicitly approved the confirmation brief
- the problem, outcome, users, and scope are clear
- no important requirement contradicts a non-goal or constraint
- researched claims are concise and sourced where useful
- uncertainty is visible rather than presented as fact
- architecture and implementation choices have not been invented
- the document is proportionate and ready for the intended handoff

After writing, report only:

- the saved path
- a one-sentence summary
- the recommended next skill
- any important unresolved question
