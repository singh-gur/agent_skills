---
name: plan
description: Uses an intake, research, and clarify loop—including bounded subagent research when available—to produce a repository-grounded implementation plan in `PLAN.md` or `plans/<task-name>.md`. Produces either a single-phase or phased plan and adapts its implementation handoff detail to whether the user selects a Workhorse or Smart executor.
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

The skill also uses one user-selected executor profile:

- **Workhorse** — implementation will use a fast, economical model that benefits from deterministic instructions and should not need to repeat complex planning.
- **Smart** — implementation will use a model capable of complex reasoning and repository exploration, so the plan can leave bounded local implementation decisions to the executor.

The executor profile changes handoff detail, not planning rigor, correctness, safety, or required user decisions.

## Core behavior

- Plan only. Do not silently switch from planning to implementation.
- Gauge task complexity during intake and research, then select simple or phased mode. If complexity is unclear, ask the user with a recommendation.
- Ask whether implementation will use a `Workhorse` or `Smart` executor during intake. Require an explicit answer and do not draft the plan until the user selects one.
- Center discovery on the repeatable **intake → research → clarify** loop.
- Explore before designing the plan. Base it on the actual repository, not guesses.
- Treat the planning pass as the primary reasoning pass.
- For a `Workhorse` executor, resolve consequential implementation decisions during planning and encode enough detail for deterministic execution.
- For a `Smart` executor, still record consequential scope, architecture, behavior, and compatibility decisions, but allow the executor to resolve bounded local choices that do not materially change the approved plan.
- During intake, ask for the plan's technical detail level and the user's preferred feedback frequency. Honor both throughout the workflow.
- Technical-detail preferences control presentation depth within the selected executor profile. They do not remove safety requirements, material decisions, or objective verification.
- Ask focused clarification questions at the requested frequency, but never let `Minimal` feedback suppress a decision needed to avoid an unsafe or materially different plan.
- When permitted subagent capabilities are available, use at least one subagent for a bounded, read-only research task during the loop.
- Keep delegated work advisory. The primary planner owns user interaction, synthesis, scope decisions, mode selection, executor-profile handling, phase design, the draft, approval, and the sole plan-file write.
- Do not write the plan file until the user has reviewed and explicitly approved the draft.
- Keep the skill harness-agnostic. Refer to capabilities generically, not by product-specific tool names.
- After writing the plan, summarize it without pasting the entire file back into chat unless asked.

## Mode selection

Select the plan shape based on execution structure, not file count alone.

Default to **simple mode**. Choose **phased mode** only when research identifies at least two meaningful checkpoints.

A meaningful checkpoint:

- produces a concrete, independently verifiable outcome
- creates a useful review, pause, handoff, or rollback boundary
- is more than setup or an arbitrary subdivision of one cohesive change

Choose **simple mode** when the work:

- has one cohesive outcome
- can be implemented and verified as one unit
- does not gain meaningful safety or reviewability from intermediate checkpoints

Choose **phased mode** when the work:

- contains multiple independently verifiable outcomes
- has ordering, migration, rollout, or dependency boundaries
- benefits materially from intermediate review, rollback, handoff, or parallel execution
- carries risk that is meaningfully reduced by staged implementation

Treat file count, estimated duration, and code volume as supporting evidence only. They do not determine the mode by themselves.

If phased mode cannot identify at least two meaningful checkpoints, use simple mode. If research cannot establish whether intermediate checkpoints add value, ask the user with a recommendation and the evidence behind it.

Honor an explicit user choice after warning about concrete drawbacks. Revise the mode whenever later evidence or scope changes invalidate the current choice, and tell the user why.

## Executor profile selection

Ask the user this question during the first intake:

> Which type of model will implement this plan?
>
> - `Workhorse` — fast and economical, but may be less reliable at complex reasoning. The plan will contain deterministic, implementation-level guidance.
> - `Smart` — capable of complex reasoning and repository exploration. The plan will remain concrete but can leave bounded local implementation choices to the executor.

Do not infer the profile from the current model, environment, task complexity, plan detail preference, or user feedback preference.

Do not default to either profile. If the user does not answer, ask again before drafting.

If the implementation model changes after the draft is prepared, revise the plan using the newly selected profile and obtain approval again.

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
- selected executor profile

Do not ask again for information already provided.

During the first intake, gather three planning preferences, ideally in one interaction:

- Executor profile:
  - `Workhorse` — deterministic implementation guidance suitable for a fast, economical executor.
  - `Smart` — concrete planning guidance that permits bounded local reasoning during implementation.
- Technical detail:
  - `Concise` — minimal prose and optional context while retaining the requirements of the selected executor profile.
  - `Standard` — balanced context and implementation detail, filling in the sections that apply.
  - `Detailed` — thorough context, rationale, contracts, edge cases, and sequencing notes.
- Feedback frequency:
  - `Minimal` — ask only about decisions that materially change the plan; otherwise use sensible defaults.
  - `Standard` — confirm key decisions and assumptions before finalizing.
  - `High` — check in on most planning decisions and confirm direction step by step.

If technical-detail or feedback preferences are unavailable, default each to `Standard`.

The executor profile has no default. Require the user to select `Workhorse` or `Smart`.

Also choose the plan destination during intake:

- `PLAN.md` in the repository root
- `plans/<task-name>.md` for organized multi-plan workflows

For `plans/`, generate a kebab-case filename and let the user adjust it.

At the start of the first loop iteration, check whether subagent capabilities are available and inspect their roles before delegating.

Treat each clarification response as new intake for the next iteration.

### 2. Research

Resolve current unknowns from evidence before asking the user.

- Inspect only directly relevant files, structure, callers, conventions, dependencies, integration points, risks, tests, and existing patterns.
- Trace the concrete symbols, call paths, data contracts, state transitions, and configuration involved far enough to support the selected executor profile.
- Identify existing helpers, abstractions, tests, and conventions the executor should reuse rather than recreate.
- For phased work, trace existing behavior and execution ordering far enough to support phase design, and detect whether the repository uses version control.
- Use current external sources only when an external API, standard, version, limit, migration path, or ecosystem fact could materially change the plan.
- Prefer observed repository facts and primary sources over assumptions.
- Avoid broad repository surveys unless needed to prevent a bad plan.

For a `Workhorse` executor, research far enough to identify exact implementation locations, relevant symbols, task ordering, contracts, reuse points, edge cases, and verification paths.

For a `Smart` executor, research far enough to establish scope, architecture, integration boundaries, consequential decisions, risks, and verification. Do not perform extra investigation solely to remove a bounded local choice the executor can safely resolve from nearby repository patterns.

When subagent capabilities are available:

- Delegate at least one bounded, read-only research task during the overall loop.
- Use a narrow repository or fact-finding assignment; partition independent areas when doing so improves coverage or confidence. If there is no repository or external research to perform, delegate a bounded review for ambiguities, missing constraints, risks, or candidate clarification questions.
- Delegate additional tasks only when independent research can usefully run in parallel or a later answer introduces a distinct research question.
- Require findings, evidence references when available, uncertainties, risks, and planning implications.
- Do not let subagents communicate with the user, choose final scope or architecture, select the mode or executor profile, design phases, author the plan, approve assumptions, modify project files, or implement the task.

The primary planner must reconcile delegated findings with directly observed evidence and resolve conflicts before relying on them.

### 3. Clarify

Ask a focused, grouped round of questions based on the intake and research.

- Ask only about decisions the user is best placed to make.
- Do not ask questions that supplied material, repository inspection, or external research can answer.
- Ask when an answer would materially affect scope, mode selection, implementation direction, architecture, sequencing, risk, compatibility, affected files, or verification.
- Require an explicit executor-profile choice if it has not been supplied.
- For phased mode, if version-control checkpointing guidance is relevant, ask which workflow strategy the user prefers.
- Use concrete choices and a recommendation when trade-offs are understood.
- Honor the requested feedback frequency.
- If no material question remains, do not interrupt the user merely to complete this step; evaluate the stop conditions.

After each answer, return to intake. Repeat research when the answer changes scope or introduces something that must be verified.

### 4. Stop conditions

Exit the loop only when:

- the outcome, scope, constraints, priorities, and success criteria are sufficiently defined
- the user has explicitly selected `Workhorse` or `Smart`
- the mode has been selected and is supported by repository evidence (or confirmed by the user)
- for simple mode, the work has been confirmed to form one cohesive, safely verifiable unit
- for phased mode, at least two meaningful checkpoints have been identified with concrete outputs and verification
- directly relevant repository facts, integration points, risks, and verification paths have been inspected
- consequential scope, architecture, behavior, sequencing, and compatibility decisions have been resolved
- for a `Workhorse` executor, the implementation path can be encoded without avoidable architectural or repository-wide reasoning during execution
- material unknowns are resolved, explicitly accepted as assumptions, or recorded with their planning impact
- no recent clarification introduces an unresearched question

If a blocking decision cannot be resolved, do not invent an answer; expose it clearly or state that the plan cannot yet be finalized.

## Workhorse executor handoff standard

Apply this section only when the user selects `Workhorse`.

Write the plan for an executor that is capable of implementation but should not need to rediscover the architecture, infer missing behavior, or choose among unresolved alternatives.

Use these rules:

- Make one recommended implementation path authoritative. Include alternatives only when the choice remains intentionally open, and explain who must decide and when.
- Distinguish observed repository facts, planning decisions, assumptions, and unresolved questions.
- Order tasks by real dependencies. State when tasks can safely run in parallel.
- Name exact file paths and, when known, the relevant symbols, components, routes, schemas, migrations, tests, or configuration keys.
- State whether each location should be inspected, created, modified, moved, or deleted.
- Describe the required behavior, inputs, outputs, contracts, invariants, and state changes precisely enough to implement without reinterpretation.
- Identify existing helpers, libraries, patterns, and neighboring implementations to reuse.
- Record relevant edge cases, error behavior, compatibility constraints, and prohibited behavior.
- Include signatures, schemas, pseudocode, payload examples, or control flow only when they remove meaningful implementation ambiguity. Do not write the implementation itself.
- Give every task an objective completion condition. Give verification steps exact commands or procedures and expected results when known.
- Avoid instructions such as “update as needed,” “handle appropriately,” “wire everything up,” “support the usual cases,” or “refactor where necessary.”
- If implementation still requires investigation, make it a bounded task with a specific question, evidence source, and decision rule. Do not hide open-ended research inside an implementation task.
- Do not transfer complexity to the executor merely to keep the plan short.

For each implementation task, include the applicable parts of this task contract:

- **Location** — path and symbol or area
- **Action** — create, modify, delete, move, or inspect
- **Change** — exact behavior or structure to implement
- **Reuse** — existing pattern, helper, or dependency to follow
- **Constraints** — contracts, edge cases, errors, compatibility, or ordering
- **Done when** — observable completion condition

Do not add empty task-contract fields. A compact task may express the complete contract in one precise sentence.

## Smart executor handoff standard

Apply this section only when the user selects `Smart`.

Keep the plan concrete and executable, but do not add task-contract scaffolding solely to eliminate choices the executor can safely resolve through local reasoning.

The plan must still:

- define the approved outcome and scope
- record consequential architecture, behavior, compatibility, and sequencing decisions
- identify affected repository areas and important integration points
- state dependencies and meaningful ordering constraints
- identify existing patterns that materially constrain implementation
- make assumptions, risks, prohibited behavior, and open questions explicit
- provide objective verification and completion criteria

The plan may leave a local implementation choice to the executor when:

- the choice does not alter approved scope, architecture, public behavior, compatibility, security, or data integrity
- the repository contains a clear nearby convention or pattern
- either reasonable choice would satisfy the same verification criteria
- resolving it does not require broad research or a new user decision

Do not use the `Smart` profile as permission to write vague tasks or omit material decisions.

## Planning workflow after discovery

### Simple mode

1. Design the single phase
   - Define one objective, the concrete implementation tasks, affected files, outputs, risks, and verification.
   - Order tasks by dependency.
   - For a `Workhorse` executor, encode the applicable task-contract details needed for deterministic execution.
   - For a `Smart` executor, preserve consequential decisions while allowing bounded local implementation choices.
   - Keep the work executable in one focused pass.
   - Do not expand scope because delegated research found optional work.

### Phased mode

1. Design balanced phases
   - Each phase should usually represent roughly 30–90 minutes of focused work.
   - Make every phase self-contained with clear prerequisites, outputs, and verification.
   - Define the concrete contracts and outputs that later phases depend on.
   - For a `Workhorse` executor, ensure later phases do not require reinterpretation of earlier planning decisions.
   - For a `Smart` executor, allow bounded local reasoning inside a phase without leaving cross-phase contracts ambiguous.
   - Avoid micro-phases that add coordination overhead without a meaningful checkpoint.
   - Split oversized phases that mix unrelated outcomes or are difficult to review.
   - Mark phases that can run in parallel.
   - Keep final phase and dependency decisions with the primary planner.

### Shared steps (both modes)

2. Draft and review before writing
   - Draft the full plan at the selected detail level and executor profile without writing the file.
   - For a `Workhorse` executor, check that implementation does not require an unrecorded consequential decision or repeated repository-wide reasoning.
   - For a `Smart` executor, check that any delegated implementation decisions are bounded and do not alter approved behavior or architecture.
   - Present the full draft for a `Concise` plan. For a longer plan, present the full draft or a faithful section-by-section summary.
   - Ask the user to approve, request edits, or reject it.
   - Revise and re-review until the user explicitly approves the content.

3. Write exactly one plan file
   - Write only the approved plan to the chosen destination.
   - Keep it concise, concrete, appropriate for the selected executor profile, and updateable during execution.
   - For optional sections with no content, write `None` instead of leaving them blank.

4. Summarize
   - Recap the objective, selected executor profile, key steps or main phases, verification, major risks or open questions, and saved path.

## Plan requirements

Structure the plan so it can be executed without additional planning at the level required by the selected executor profile.

### Simple-mode template

```md
# Simple Implementation Plan: <Task Name>

## Overview

<1-3 sentences describing the desired outcome.>

## Planning Profile

- Executor: <Workhorse|Smart>
- Detail: <Concise|Standard|Detailed>

## Relevant Context

- <Observed repository fact or directly relevant file/pattern.>

## Decisions

- <Resolved consequential implementation decision and brief reason, or `None`.>

## Assumptions

- <Assumption and its implementation impact, or `None`.>

## Single-Phase Plan

- Objective: <single objective>
- Status: Not Started
- Complexity: <Low|Medium>
- Estimated Time: <estimate>
- Context: <brief execution context>

## Files

| Path     | Action                     | Purpose |
| -------- | -------------------------- | ------- |
| `<path>` | <inspect/create/modify/etc> | <role in implementation> |

## Implementation Tasks

- [ ] <Concrete task appropriate for the selected executor profile>

## Verification

- [ ] <Command, test, or manual check and expected result>

## Completion Gate

<User review and explicit confirmation that the single phase is complete.>

## Outputs

- <Expected changed files, tests, or deliverables.>

## Risks

- <Risk and mitigation, or `None`.>

## Questions for User

- <Question and planning impact, or `None`.>
```

For a `Workhorse` executor, implementation tasks should use the task contract where applicable:

```md
- [ ] **`<path>` — `<symbol or area>`**: <exact action and behavior>.
  - Reuse: <existing pattern/helper, when applicable>
  - Constraints: <ordering, contract, edge cases, or errors>
  - Done when: <observable completion condition>
```

Include only sub-bullets that carry useful information. Keep a task on one line when that line already provides a complete implementation contract.

For a `Smart` executor, use compact tasks that identify the location, required outcome, material constraints, and verification without prescribing non-consequential implementation choices.

### Phased-mode recommended sections

```md
# Implementation Plan: <Task Name>

## Overview
## Planning Profile
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
- `Files` table with path, action, and purpose
- `Implementation Tasks` as markdown checkboxes appropriate for the selected executor profile
- `Execution Tracking Rules`
- `Verification` with expected results
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
- record the user-selected executor profile
- reflect directly relevant repository evidence
- make assumptions, risks, and open questions explicit
- record consequential implementation and architecture decisions
- list concrete files likely to change or inspect
- specify meaningful task ordering and dependencies
- include objective verification steps and expected results where possible
- avoid vague tasks such as “update code as needed”
- keep sibling phases reasonably balanced in phased mode
- provide enough implementation detail for the selected executor profile
- use deterministic task instructions when `Workhorse` is selected
- avoid unnecessary task-contract scaffolding when `Smart` is selected
- remain concise by omitting irrelevant prose, not material decisions
- synthesize delegated findings instead of copying them uncritically

## Important rules

- Do not implement code while acting in planning mode.
- Do not invent repository details you have not inspected.
- Complete the intake → research → clarify loop before drafting.
- Select the mode deliberately; ask the user when complexity is ambiguous.
- Require the user to select `Workhorse` or `Smart`; do not infer or default the executor profile.
- Apply deterministic executor-handoff requirements only when `Workhorse` is selected.
- Use at least one bounded, read-only subagent during the loop when that capability is available.
- Keep all user interaction, planning decisions, approval, and file writing with the primary planner.
- Do not write the plan file until the user has reviewed and explicitly approved it.
- Keep plan instructions executable across different agentic environments.
- Do not mention product-specific tool names unless the user explicitly asks for a harness-specific variant.
- After saving the plan, respond with a concise summary and the saved path.
