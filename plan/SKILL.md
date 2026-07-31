---
name: plan
description: Uses an intake, research, and clarify loop—including bounded subagent research when available—to produce an implementation plan in `PLAN.md` or `plans/<task-name>.md`. Gauges task complexity to produce either a single-phase plan for simple, low-risk changes or a phased plan for complex features, refactors, migrations, and architectural work; asks the user when complexity is unclear.
metadata:
  author: gurbakhshish
  source: merged from simple-plan and super-plan (https://github.com/singh-gur/agent_skills)
  spec: https://agentskills.io/specification
---

# Plan

Create an implementation plan only. Do not implement code while this skill is active unless the user explicitly changes the task.

## When to use

Use this skill when the user asks for a plan, roadmap, breakdown, or implementation strategy for any coding task—from a simple bug fix to a complex migration. Skip it only for tiny one-step changes unless the user explicitly wants a written plan.

## Modes

The skill produces one of two plan shapes:

- **Simple mode** — a single-phase plan for work executable in one focused pass.
- **Phased mode** — a multi-phase plan for complex work that benefits from reviewable checkpoints.

## Core behavior

- Plan only. Do not silently switch from planning to implementation.
- Gauge task complexity during intake and research, then select simple or phased mode. If complexity is unclear, ask the user with a recommendation.
- Center discovery on the repeatable **intake → research → clarify** loop.
- Explore before designing the plan. Base it on the actual repository, not guesses.
- During intake, ask for the plan's technical detail level and the user's preferred feedback frequency. Honor both throughout the workflow.
- Ask focused clarification questions at the requested frequency, but never let `Minimal` feedback suppress a decision needed to avoid an unsafe or materially different plan.
- When permitted subagent capabilities are available, use at least one subagent for a bounded, read-only research task during the loop.
- Keep delegated work advisory. The primary planner owns user interaction, synthesis, scope decisions, mode selection, phase design, the draft, approval, and the sole plan-file write.
- Do not write the plan file until the user has reviewed and explicitly approved the draft.
- Keep the skill harness-agnostic. Refer to capabilities generically, not by product-specific tool names.
- After writing the plan, summarize it without pasting the entire file back into chat unless asked.

## Mode selection

Assess complexity from intake and research evidence.

Choose **simple mode** when the work:

- has a clear expected outcome and low risk
- touches a small, well-understood set of files
- fits one focused implementation pass without intermediate review checkpoints

Choose **phased mode** when the work:

- spans multiple files, systems, or decision points
- includes refactors, migrations, architecture updates, or risky edits
- benefits from independently reviewable phases or handoff to another executor

If the signals conflict or the task sits near the boundary, ask the user which mode to use, with a concrete recommendation and the evidence behind it. Never silently pick a mode for an ambiguous task.

Mode can be revised once if later research or a clarification answer changes the picture; tell the user when that happens. If the user explicitly chose a mode that looks wrong, warn them but honor their choice: for simple mode on a too-large task, constrain the plan to the safest useful single phase instead of switching.

## Intake → research → clarify loop

Repeat this loop until the stop conditions are met.

### 1. Intake

Capture and maintain a compact working brief containing:

- expected outcome
- in-scope and out-of-scope work
- constraints, priorities, and success criteria
- supplied context and known repository areas
- assumptions and material unknowns
- likely systems, integration points, and risk areas
- complexity signals for mode selection

Do not ask again for information already provided.

During the first intake, gather two planning preferences, ideally in one interaction:

- Technical detail:
  - `Concise` — minimal prose, bullet points only, skip optional sections.
  - `Standard` — balanced detail, fill in the sections that apply.
  - `Detailed` — thorough context, rationale, and edge-case notes.
- Feedback frequency:
  - `Minimal` — ask only about decisions that materially change the plan; otherwise use sensible defaults.
  - `Standard` — confirm key decisions and assumptions before finalizing.
  - `High` — check in on most planning decisions and confirm direction step by step.

If preferences are unavailable, default to `Standard` detail and `Standard` feedback.

Also choose the plan destination during intake:

- `PLAN.md` in the repository root
- `plans/<task-name>.md` for organized multi-plan workflows

For `plans/`, generate a kebab-case filename and let the user adjust it.

At the start of the first loop iteration, check whether subagent capabilities are available and inspect their roles before delegating.

Treat each clarification response as new intake for the next iteration.

### 2. Research

Resolve current unknowns from evidence before asking the user.

- Inspect only directly relevant files, structure, callers, conventions, dependencies, integration points, risks, tests, and existing patterns.
- For phased work, trace existing behavior and execution ordering far enough to support phase design, and detect whether the repository uses version control.
- Use current external sources only when an external API, standard, version, limit, migration path, or ecosystem fact could materially change the plan.
- Prefer observed repository facts and primary sources over assumptions.
- Avoid broad repository surveys unless needed to prevent a bad plan.

When subagent capabilities are available:

- Delegate at least one bounded, read-only research task during the overall loop.
- Use a narrow repository or fact-finding assignment; partition independent areas when doing so improves coverage or confidence. If there is no repository or external research to perform, delegate a bounded review for ambiguities, missing constraints, risks, or candidate clarification questions.
- Delegate additional tasks only when independent research can usefully run in parallel or a later answer introduces a distinct research question.
- Require findings, evidence references when available, uncertainties, risks, and planning implications.
- Do not let subagents communicate with the user, choose final scope or architecture, select the mode, design phases, author the plan, approve assumptions, modify project files, or implement the task.

The primary planner must reconcile delegated findings with directly observed evidence and resolve conflicts before relying on them.

### 3. Clarify

Ask a focused, grouped round of questions based on the intake and research.

- Ask only about decisions the user is best placed to make.
- Do not ask questions that supplied material, repository inspection, or external research can answer.
- Ask when an answer would materially affect scope, mode selection, implementation direction, architecture, sequencing, risk, compatibility, affected files, or verification.
- For phased mode, if version-control checkpointing guidance is relevant, ask which workflow strategy the user prefers.
- Use concrete choices and a recommendation when trade-offs are understood.
- Honor the requested feedback frequency.
- If no material question remains, do not interrupt the user merely to complete this step; evaluate the stop conditions.

After each answer, return to intake. Repeat research when the answer changes scope or introduces something that must be verified.

### 4. Stop conditions

Exit the loop only when:

- the outcome, scope, constraints, priorities, and success criteria are sufficiently defined
- the mode has been selected and is supported by repository evidence (or confirmed by the user)
- directly relevant repository facts, integration points, risks, and verification paths have been inspected
- material unknowns are resolved, explicitly accepted as assumptions, or recorded with their planning impact
- no recent clarification introduces an unresearched question

If a blocking decision cannot be resolved, do not invent an answer; expose it clearly or state that the plan cannot yet be finalized.

## Planning workflow after discovery

### Simple mode

1. Design the single phase
   - Define one objective, the concrete implementation tasks, affected files, outputs, risks, and verification.
   - Keep the work executable in one focused pass.
   - Do not expand scope because delegated research found optional work.

### Phased mode

1. Design balanced phases
   - Each phase should usually represent roughly 30–90 minutes of focused work.
   - Make every phase self-contained with clear prerequisites, outputs, and verification.
   - Avoid micro-phases that add coordination overhead without a meaningful checkpoint.
   - Split oversized phases that mix unrelated outcomes or are difficult to review.
   - Mark phases that can run in parallel.
   - Keep final phase and dependency decisions with the primary planner.

### Shared steps (both modes)

2. Draft and review before writing
   - Draft the full plan at the selected detail level without writing the file.
   - Present the full draft for a `Concise` plan. For a longer plan, present the full draft or a faithful section-by-section summary.
   - Ask the user to approve, request edits, or reject it.
   - Revise and re-review until the user explicitly approves the content.

3. Write exactly one plan file
   - Write only the approved plan to the chosen destination.
   - Keep it concise, concrete, and updateable during execution.
   - For optional sections with no content, write `None` instead of leaving them blank.

4. Summarize
   - Recap the objective, key steps or main phases, verification, major risks or open questions, and saved path.

## Plan requirements

Structure the plan so it can be executed without extra planning.

### Simple-mode template

```md
# Simple Implementation Plan: <Task Name>

## Overview

<1-3 sentences describing the desired outcome.>

## Relevant Context

- <Observed repository fact or directly relevant file/pattern.>

## Assumptions

- <Assumption, or `None`.>

## Single-Phase Plan

- Objective: <single objective>
- Status: Not Started
- Complexity: <Low|Medium>
- Estimated Time: <estimate>
- Context: <brief execution context>

## Files

| Path     | Purpose               |
| -------- | --------------------- |
| `<path>` | <inspect/change/test> |

## Implementation Tasks

- [ ] <Concrete task>
- [ ] <Concrete task>

## Verification

- [ ] <Command, test, or manual check>

## Completion Gate

<User review and explicit confirmation that the single phase is complete.>

## Outputs

- <Expected changed files, tests, or deliverables.>

## Risks

- <Risk, or `None`.>

## Questions for User

- <Question, or `None`.>
```

### Phased-mode recommended sections

```md
# Implementation Plan: <Task Name>

## Overview
## Global Context
## Architecture Decisions
## Assumptions
## Phase Strategy
## Phases
## Phase Dependencies
## Risks
## Questions for User
```

### Phase template (phased mode)

Each phase should include:

- `Objective`
- `Status: Not Started`
- `Complexity`
- `Estimated Time`
- `Prerequisites`
- `Context for this Phase`
- `Files` table
- `Implementation Tasks` as markdown checkboxes
- `Execution Tracking Rules`
- `Verification`
- `Completion Gate`
- `Outputs`

### Execution tracking rules

Write the plan so it can be updated during implementation:

- Initial status must be `Not Started`.
- When execution begins, the phase status should become `In Progress`.
- Completed tasks should be checked off.
- Skipped or superseded tasks should be struck through rather than falsely marked done.
- A phase should become `Complete` only after the user reviews the result and explicitly confirms it is done.
- If the project uses a checkpointing workflow, cleanup or finalization for that phase should happen immediately after user-confirmed completion.

## Version-control guidance (phased mode only)

If the repository uses version control and the user wants workflow guidance, include one strategy section matching their choice. Keep the terminology universal and describe the workflow by intent.

Possible strategies:

- separate working directories for each phase
- separate feature branches for each phase
- checkpoint tags on a shared branch
- decide the strategy separately when each phase starts

For the chosen strategy, explain:

- how execution starts for a phase
- how dependencies affect later phases
- what must happen when the user confirms the phase is complete
- how to avoid leaving unfinished phase state behind

Do not depend on harness-specific commands or tool names in the skill text.

## Quality bar

A good plan produced by this skill should:

- use the mode the task's complexity actually warrants
- reflect directly relevant repository evidence
- make assumptions, risks, and open questions explicit
- list concrete files likely to change or inspect
- include objective verification steps where possible
- avoid vague tasks such as "update code as needed"
- keep sibling phases reasonably balanced in phased mode
- provide enough context for handoff to another executor
- synthesize delegated findings instead of copying them uncritically

## Important rules

- Do not implement code while acting in planning mode.
- Do not invent repository details you have not inspected.
- Complete the intake → research → clarify loop before drafting.
- Select the mode deliberately; ask the user when complexity is ambiguous.
- Use at least one bounded, read-only subagent during the loop when that capability is available.
- Keep all user interaction, planning decisions, approval, and file writing with the primary planner.
- Do not write the plan file until the user has reviewed and explicitly approved it.
- Keep plan instructions executable across different agentic environments.
- Do not mention product-specific tool names unless the user explicitly asks for a harness-specific variant.
- After saving the plan, respond with a concise summary and the saved path.
