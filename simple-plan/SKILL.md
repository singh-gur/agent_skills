---
name: simple-plan
description: Uses an intake, research, and clarify loop—including bounded subagent research when available—to produce a single-phase implementation plan in `PLAN.md` or `plans/<task-name>.md`. Use for simple, low-risk changes that should be implemented in one focused pass.
metadata:
  author: gurbakhshish
  source: adapted from https://github.com/singh-gur/agent_skills/tree/main/super-plan
  spec: https://agentskills.io/specification
---

# Simple Plan

Create a concise, single-phase implementation plan only. Do not implement code while this skill is active unless the user explicitly changes the task.

## When to use

Use this skill when:

- the task is simple enough to implement in one focused phase
- the work is low-risk and has a clear expected outcome
- the user asks for a lightweight plan, short plan, simple plan, or single-phase plan
- a future executor should be able to complete the task without a multi-phase roadmap

Do not use this skill for complex features, broad refactors, migrations, architectural changes, or work that should be split into multiple reviewable phases. If the user explicitly chose this skill for a task that appears too complex, warn that the task may be too large for a simple single-phase plan, then keep the plan constrained to the safest useful single phase instead of switching workflows automatically.

## Core behavior

- Plan only. Do not silently switch from planning to implementation.
- Keep the plan single-phase. If the full task cannot fit safely in one phase, say so and plan only the safest useful single-phase slice unless the user asks to change workflows.
- Center discovery on the repeatable **intake → research → clarify** loop.
- Explore only the context needed to make a safe plan.
- During intake, ask for the plan's technical detail level and the user's preferred feedback frequency. Honor both throughout the workflow.
- Ask focused clarification questions at the requested frequency, but never let `Minimal` feedback suppress a decision needed to avoid an unsafe or materially different plan.
- When permitted subagent capabilities are available, use at least one subagent for a bounded, read-only research task during the loop.
- Keep delegated work advisory. The primary planner owns user interaction, synthesis, scope decisions, the draft, approval, and the sole plan-file write.
- Prefer practical, execution-ready steps over exhaustive analysis.
- Do not write the plan file until the user has reviewed and explicitly approved the draft.
- Keep the skill harness-agnostic. Refer to capabilities generically, not by product-specific tool names.
- After writing the plan, summarize it without pasting the entire file back into chat unless asked.

## Intake → research → clarify loop

Repeat this loop until the stop conditions are met.

### 1. Intake

Capture and maintain a compact working brief containing:

- expected outcome
- in-scope and out-of-scope work
- constraints and success criteria
- supplied context and known repository areas
- assumptions and material unknowns
- suitability for one safe implementation phase

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

- Inspect only directly relevant files, callers, tests, conventions, dependencies, and existing patterns.
- Use current external sources only when an external API, standard, version, limit, or ecosystem fact could materially change the plan.
- Prefer observed repository facts and primary sources over assumptions.
- Avoid broad repository surveys unless needed to prevent a bad plan.

When subagent capabilities are available:

- Delegate at least one bounded, read-only research task during the overall loop.
- Use a narrow repository or fact-finding assignment. If there is no repository or external research to perform, delegate a bounded review for ambiguities, missing constraints, or candidate clarification questions.
- Delegate additional tasks only when independent research can usefully run in parallel or a later answer introduces a distinct research question.
- Require findings, evidence references when available, uncertainties, and planning implications.
- Do not let subagents communicate with the user, choose final scope, author the plan, approve assumptions, modify project files, or implement the task.

The primary planner must reconcile delegated findings with directly observed evidence and resolve conflicts before relying on them.

### 3. Clarify

Ask a focused, grouped round of questions based on the intake and research.

- Ask only about decisions the user is best placed to make.
- Do not ask questions that supplied material, repository inspection, or external research can answer.
- Ask when an answer would materially affect scope, implementation direction, risk, affected files, or verification.
- Use concrete choices and a recommendation when trade-offs are understood.
- Honor the requested feedback frequency.
- If no material question remains, do not interrupt the user merely to complete this step; evaluate the stop conditions.

After each answer, return to intake. Repeat research when the answer changes scope or introduces something that must be verified.

### 4. Stop conditions

Exit the loop only when:

- the outcome, scope, constraints, and success criteria are sufficiently defined
- directly relevant repository facts and verification paths have been inspected
- material unknowns are resolved, explicitly accepted as assumptions, or recorded with their planning impact
- no recent clarification introduces an unresearched question
- the requested work fits one safe implementation phase

If the full task does not fit one phase, warn the user and constrain the plan to the safest useful single-phase slice. If a blocking decision cannot be resolved, do not invent an answer; expose it clearly or state that the plan cannot yet be finalized.

## Planning workflow after discovery

1. Design the single phase
   - Define one objective, the concrete implementation tasks, affected files, outputs, risks, and verification.
   - Keep the work executable in one focused pass.
   - Do not introduce phases or expand scope because delegated research found optional work.

2. Draft and review before writing
   - Draft the full plan at the selected detail level without writing the file.
   - Present the full draft for a `Concise` plan. For a longer plan, present the full draft or a faithful section-by-section summary.
   - Ask the user to approve, request edits, or reject it.
   - Revise and re-review until the user explicitly approves the content.

3. Write exactly one plan file
   - Write only the approved plan to the chosen destination.
   - Keep it concise, concrete, and easy to execute in one pass.
   - For optional sections with no content, write `None` instead of leaving them blank.

4. Summarize
   - Recap the objective, key steps, verification, open questions, and saved path.

## Plan requirements

Structure the plan so it can be executed without extra planning.

### Recommended sections

```md
# Simple Implementation Plan: <Task Name>

## Overview

## Relevant Context

## Assumptions

## Single-Phase Plan

## Files

## Implementation Tasks

## Verification

## Risks

## Questions for User
```

Use `None` for optional sections that do not apply, especially `Assumptions`, `Risks`, `Outputs`, and `Questions for User`.

### Compact output template

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

### Single-phase template

The single phase should include:

- `Objective`
- `Status: Not Started`
- `Complexity`
- `Estimated Time`
- `Context`
- `Files` table
- `Implementation Tasks` as markdown checkboxes
- `Verification`
- `Completion Gate`
- `Outputs`

### Execution tracking rules

Write the plan so it can be updated during implementation:

- Initial status must be `Not Started`.
- When execution begins, the phase status should become `In Progress`.
- Completed tasks should be checked off.
- Skipped or superseded tasks should be struck through rather than falsely marked done.
- The phase should become `Complete` only after the user reviews the result and explicitly confirms it is done.

## Quality bar

A good plan produced by this skill should:

- fit in one implementation phase
- reflect directly relevant repository evidence
- make assumptions and open questions explicit
- list concrete files likely to change or inspect
- include objective verification steps where possible
- avoid vague tasks such as "update code as needed"
- stay brief enough to be useful for simple work
- synthesize delegated findings instead of copying them uncritically

## Important rules

- Do not implement code while acting in planning mode.
- Do not invent repository details you have not inspected.
- Complete the intake → research → clarify loop before drafting.
- Use at least one bounded, read-only subagent during the loop when that capability is available.
- Keep all user interaction, planning decisions, approval, and file writing with the primary planner.
- Do not write the plan file until the user has reviewed and explicitly approved it.
- Do not create multiple phases. If multiple phases seem necessary, warn the user and constrain the output to the safest useful single-phase plan.
- Do not include phase dependency graphs, version-control strategies, broad architecture decision records, migration plans, or multi-phase roadmaps unless the user explicitly asks.
- Do not mention product-specific tool names unless the user explicitly asks for a harness-specific variant.
- After saving the plan, respond with a concise summary and the saved path.
