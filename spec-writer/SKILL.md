---
name: spec-writer
description: Converts a raw, incomplete, or ambiguous request into an approved, evidence-backed `SPECS.md`. Refines the ask, delegates parallel research to subagents, interviews the user with focused Q&A, synthesizes traceable requirements, independently verifies findings, presents a confirmation brief, and writes the final specification only after approval. Use when a feature, product, workflow, integration, or system idea needs a clear requirements specification before architecture, planning, or implementation.
compatibility: Requires interactive user questions, file/repository inspection, web research when external facts matter, and a subagent/delegation capability for research and verification. If subagents are unavailable, ask before using a single-agent fallback.
metadata:
  author: gurbakhshish
  spec: https://agentskills.io/specification
---

# Spec Writer

Turn a raw ask into a clear, complete, internally consistent, evidence-backed, and user-approved `SPECS.md`. Specification only—do not design the architecture, produce an implementation plan, or implement the solution unless the user explicitly changes the task.

## When to use

Use this skill when:

- the user has a rough feature, product, workflow, integration, or system request
- requirements are incomplete, ambiguous, contradictory, or spread across conversation and repository context
- stakeholders need a shared specification before architecture or implementation planning
- acceptance criteria, scope, constraints, assumptions, and open questions must be made explicit
- an existing `SPECS.md` needs to be reconstructed or materially refined from new information

Do not use this skill for a request that is already fully specified and only needs an implementation plan. Do not silently turn the specification into architecture or code.

## Required outcome

The final result must be an approved `SPECS.md` that:

- expresses the user's intent in precise, testable language
- distinguishes goals, requirements, constraints, assumptions, decisions, and evidence
- defines explicit in-scope and out-of-scope behavior
- includes stable requirement IDs and acceptance criteria
- covers relevant happy paths, edge cases, failure modes, security, privacy, accessibility, performance, operability, and compatibility concerns
- resolves every blocking question before finalization
- records non-blocking open questions honestly
- traces material requirements back to the refined ask, user answers, repository evidence, or researched sources
- contains no invented facts presented as decisions

## Non-negotiable behavior

- **Spec only.** Do not implement, create an architecture design, or write an implementation plan while this skill is active.
- **Inspect before asking.** Read relevant repository files and supplied material before asking questions the available context can answer.
- **Follow the six stages in order.** Refinement → delegated research → user Q&A → synthesis → verification and confirmation → final `SPECS.md`.
- **Use subagents for research and verification.** The parent agent owns scope, synthesis, user interaction, and the only project-file write.
- **No speculative requirements.** Label uncertain items as assumptions or questions until the user confirms them.
- **No premature file write.** Do not create or modify `SPECS.md` until the user approves the confirmation brief.
- **Explicit approval gate.** Silence, partial answers, or an unanswered confirmation form are not approval.
- **Keep evidence proportional.** Research enough to resolve material uncertainty; stop when additional searching would not change the specification.
- **Protect sensitive context.** Never read secrets or send credentials, private keys, tokens, or unnecessary sensitive data to subagents or external research tools.

## Required resources

Resolve these paths relative to this `SKILL.md` and read each file completely before using the corresponding stage:

- `references/spec-profiles.md` — select proportional profile(s) and detail level during refinement; confirm them during Q&A.
- `references/research-evidence.md` — use for research tasks, evidence grading, conflicts, freshness, structured outputs, and verification packets.
- `references/quality-rubric.md` — use during requirement synthesis, delegated review, approval gating, and final validation.
- `templates/SPECS.template.md` — use as the canonical final document structure, adapting it according to the approved profile and detail level.

These files are canonical for their concerns. Do not recreate competing profile, evidence, quality, or template rules in project files.

## Stage 1 — Refine the raw ask

Convert the initial request into a structured **Refined Ask v0** without changing its meaning.

### Inspect available context

Before refining:

- read the user's complete request and supplied artifacts
- inspect relevant repository structure, documentation, interfaces, schemas, tests, and conventions when a repository is available
- identify existing behavior that the request changes or depends on
- do not inspect secrets, credential files, or unrelated sensitive data

### Produce Refined Ask v0

Organize the request into:

- **Intent:** what outcome the user wants and why
- **Target users/stakeholders:** who benefits, operates, approves, or is affected
- **Problem statement:** current pain or opportunity
- **Desired outcomes:** observable results rather than implementation guesses
- **Initial scope:** explicitly requested capabilities
- **Initial non-goals:** exclusions stated or strongly implied by the user
- **Known constraints:** technical, business, policy, timing, compatibility, or operational limits
- **Success signals:** what would demonstrate value or completion
- **Known unknowns:** ambiguities, contradictions, and missing decisions

Rewrite vague language into precise statements only when the meaning is supported. Preserve uncertainty with labels such as `Assumption`, `Needs research`, or `Needs user decision`. Do not ask the user questions yet unless the raw ask is too incomplete to identify even a research domain.

Using `references/spec-profiles.md`, infer and record:

- a provisional primary specification profile and any materially relevant secondary profile
- a provisional detail level: Concept, Build Ready, or High Assurance
- why that combination is proportional to the next intended handoff
- the corresponding research budget and likely conditional sections

Treat this as a recommendation, not a decision; confirm it in the first Q&A round.

## Stage 2 — Research with subagents

Use delegated, read-only research to resolve discoverable unknowns before interviewing the user.

### Discover available agents

- Inspect configured agents/chains before execution and use only available, non-disabled agents.
- Prefer fresh-context research children with narrow tasks and minimal necessary context.
- If no subagent capability or suitable agents are available, explain the limitation and ask whether the user wants a clearly labeled single-agent fallback. Do not pretend delegation occurred.

### Research fanout

For a substantive request, launch 2–4 parallel read-only tracks with distinct responsibilities. Adapt these tracks to the task:

1. **Repository/current-state research** — map relevant files, existing behavior, interfaces, constraints, patterns, tests, and likely compatibility requirements.
2. **External/domain research** — examine official documentation, standards, regulations, APIs, product conventions, or current ecosystem behavior.
3. **User/product research** — identify expected user journeys, stakeholder concerns, domain terminology, accessibility/usability expectations, and common failure scenarios.
4. **Feasibility/risk research** — challenge hidden dependencies, security/privacy concerns, operational limits, edge cases, and claims that need evidence.

Use `scout` or `context-builder` for repository context, `researcher` for external evidence, and a fresh `reviewer` or equivalent for risk/challenge analysis when those roles exist. Do not force irrelevant web research; each track must answer a material uncertainty.

### Subagent task contract

Follow `references/research-evidence.md`. Each task should state:

- the refined ask, provisional profile/detail level, and assigned research angle
- relevant files, artifacts, or URLs to inspect
- questions to answer and explicit non-goals
- read-only constraint: do not modify project/source files
- the required structured output contract: atomic claim, E1–E4 evidence level, source location, product/version/region, publication/update date, access date, volatility/recheck trigger, confidence, applicability, requirement implication, contradictions, and remaining questions
- stop rule: stop after enough authoritative evidence exists to inform requirements

Use structured output schemas when supported; otherwise require the same fields under stable Markdown headings. Prefer asynchronous parallel research when supported, then wait for all required results before synthesis. Keep one writer: only the parent may eventually write `SPECS.md`.

### Research synthesis

The parent must compare—not concatenate—subagent findings. Normalize them into the `EVD-###` research ledger defined in `references/research-evidence.md`, including evidence level, freshness/version, applicability, confidence, implications, contradictions, and remaining questions.

Apply the documented source precedence without confusing current behavior with desired behavior. Discard unsupported recommendations and resolve conflicts through stronger evidence, correct version/scope interpretation, or a later user decision.

## Stage 3 — Clarifying Q&A

Ask the user only questions that remain after inspection and research. The goal is shared understanding, not a long generic questionnaire.

### Question design

- Use the environment's interactive question tool when available.
- Group related decisions into one focused form, normally 5–7 questions and never more than 10 per round.
- Order questions by decision impact and dependency so early answers can eliminate later questions.
- Prefer choice questions when the options and trade-offs are known; include a recommended option, concise consequences, and a `Use the recommendation` path when appropriate.
- Use text questions for domain-specific facts or when options cannot be responsibly enumerated.
- Ask highest-impact questions first: goals, users, scope boundaries, critical behavior, data/safety, constraints, and success criteria.
- Cite the research or repository fact that motivated a question when useful.
- Do not ask the user to decide facts that can be verified independently.
- Do not bury several independent decisions inside one question.

### Required clarification coverage

In the first round, confirm the recommended specification profile, detail level, feedback cadence, and any research-depth/cost trade-off that requires user preference. Clarify all applicable areas:

- primary users, stakeholders, and permissions
- desired outcomes and measurable success
- in-scope and out-of-scope behavior
- core user journeys and priority order
- inputs, outputs, data ownership, retention, migration, and deletion
- integrations, contracts, compatibility, and dependencies
- validation, errors, retries, cancellation, idempotency, and recovery
- security, privacy, compliance, abuse, and audit needs
- accessibility, localization, performance, scale, availability, and operability
- rollout constraints, backward compatibility, and deprecation
- acceptance authority and launch readiness

Assign stable `DEC-###` IDs to confirmed decisions. After each round, summarize new decisions, changed assumptions, resolved questions, and newly introduced questions. Run additional focused rounds only when answers expose material unknowns; avoid repeating settled questions. If the user leaves a blocking question unanswered, mark it clearly and do not advance to final approval.

## Stage 4 — Combine and structure all information

Merge the refined ask, research ledger, repository facts, and user answers into a coherent specification model.

### Normalize into a requirements ledger

For every material item, assign a stable ID:

- `G-###` — goal
- `NG-###` — non-goal
- `FR-###` — functional requirement
- `NFR-###` — non-functional requirement
- `AC-###` — acceptance criterion
- `CON-###` — constraint or dependency
- `ASM-###` — assumption
- `RISK-###` — risk
- `OQ-###` — non-blocking open question

Each requirement must use the record defined in `references/quality-rubric.md`, including:

- one atomic, unambiguous normative statement using **must**, **should**, or **may** deliberately
- rationale or user value
- priority such as Must / Should / Could / Won't for this scope
- one or more driver IDs: `G-###`, `CON-###`, or `RISK-###`
- one or more source IDs: raw/refined request item, `DEC-###`, or `EVD-###`
- linked acceptance criteria and named verification method
- dependencies, conflicts, and related requirements where material

Requirements must describe externally meaningful behavior or constraints, not speculative implementation details. Architecture or technology choices belong only when they are user constraints or verified prerequisites. Move intentionally deferred architecture/implementation choices into **Deferred Design Decisions**.

### Consistency pass

Before verification:

- remove duplicates and vague wording
- separate requirements that contain multiple independently testable behaviors
- ensure every goal has supporting requirements
- ensure every Must requirement has measurable acceptance criteria covering happy-path behavior plus applicable negative/boundary and failure/recovery behavior
- ensure every Must/Should NFR has a metric, unit, target/tolerance, measurement context, and verification method—or a clearly approved assumption/open decision instead of an invented number
- ensure non-goals do not contradict requirements
- reconcile terminology into a short glossary
- distinguish confirmed decisions from assumptions
- ensure unresolved blocking questions remain visible
- check that success metrics measure outcomes rather than activity

## Stage 5 — Verify, brief, and obtain confirmation

Verification must be independent enough to catch synthesis errors before the user approves the specification.

### Evidence verification

- Recheck repository claims against actual files and interfaces.
- Recheck external claims against authoritative primary sources; use current sources for versioned or time-sensitive facts.
- Verify that every citation supports the exact claim attached to it.
- Mark any unverifiable claim as an assumption or remove it.

### Delegated verification

Launch fresh-context, read-only verifier/reviewer subagents using the verification packet and finding schema from `references/research-evidence.md`. Withhold the parent's conclusions and persuasive reasoning. Select distinct stakeholder angles proportional to the approved profile/detail level:

- product value, users, scope, and journey completeness
- engineering feasibility, contracts, and compatibility
- QA testability, acceptance coverage, boundaries, and failure behavior
- security/privacy/compliance or domain correctness when relevant
- reliability/operations when the work has production or service-level impact

Verifiers must report severity, affected IDs, exact evidence, impact, smallest correction, and whether user input is required. They must not edit project files or make product decisions. The parent synthesizes their findings, fixes objective defects, and sends unresolved scope/product decisions back through Q&A. Do not call the specification verified merely because the drafting agent says it is complete.

Apply every approval gate in `references/quality-rubric.md`. Do not present the confirmation brief while any Blocker, unresolved Major finding, blocking question, orphan Must requirement, or unmeasurable mandatory quality requirement remains unless the missing threshold is explicitly represented through the rubric's approved assumption or non-blocking open-decision exception with an owner and validation path.

### Confirmation brief

Before writing `SPECS.md`, present a concise but faithful brief containing:

- refined problem and intended outcome
- selected profile, detail level, and why they are proportional
- users/stakeholders
- goals and non-goals
- scope summary and major user journeys
- key functional and non-functional requirements
- acceptance approach and success metrics
- constraints and dependencies
- assumptions and risks
- resolved decisions
- remaining non-blocking open questions
- research evidence summary and confidence
- verification findings and how they were resolved
- proposed output path

Then ask for one explicit decision using the interactive question tool when available; otherwise present the same choices clearly in normal chat:

- **Approve and generate `SPECS.md`**
- **Revise specific areas**
- **Provide missing information**
- **Cancel**

If revision or missing information is selected, collect the details, update the synthesis, repeat relevant verification, and present a new confirmation brief. Never treat a recommendation as user approval.

## Stage 6 — Generate the final `SPECS.md`

Write only after explicit approval. Default to `SPECS.md` at the repository root unless the user selects another path or established project conventions clearly require one.

If the target file already exists:

- read it first and enter amendment mode
- identify its baseline version, status, approver, still-valid decisions, and superseded content
- preserve stable IDs where semantics did not change
- present the intended replacement/update scope and material delta during confirmation
- increment the version and revision history after approval
- never overwrite unrelated approved content silently

### Required document structure

Use `templates/SPECS.template.md` as the canonical structure. Adapt it using the approved profile and detail level from `references/spec-profiles.md`:

- preserve the core sections needed for scope, requirements, acceptance, decisions, evidence, and traceability
- include only profile-specific sections that answer material questions
- keep version, owner/approver, revision history, Deferred Design Decisions, and approval metadata
- omit optional sections cleanly rather than producing empty boilerplate
- state `Not applicable` with a reason where a required review area could otherwise look accidentally omitted

### Writing standard

- Use concise, direct, domain-consistent language.
- Use **must** for mandatory requirements, **should** for expected behavior with acceptable exceptions, and **may** for optional behavior.
- Give requirements and acceptance criteria stable IDs.
- Prefer tables only when they improve scanning and traceability.
- Express acceptance criteria as observable outcomes; use Given/When/Then when it clarifies stateful behavior.
- Include diagrams only when the user requests them. If a dedicated diagram skill is available, ask before expanding scope to create a separate diagram artifact and keep `SPECS.md` as the only write owned by this workflow. If no diagram skill is available, specify the required diagram textually or ask the user how to proceed; do not invent a drawing workflow or undeclared dependency.
- Keep implementation details out unless they are approved constraints.
- Record unresolved non-blocking questions; never hide them to make the document appear complete.

### Traceability matrix

At minimum, map:

- refined-ask item or user decision
- requirement ID
- acceptance criterion ID
- evidence/source
- status: Confirmed / Assumption / Open

No must-have requirement may be missing an acceptance criterion or source.

## Completion checks

Before reporting completion, run the full final-document and approval-gate checks in `references/quality-rubric.md`, then verify:

- all six stages were completed in order
- the approved profile and detail level are recorded and reflected proportionally in the document
- subagents contributed to both research and verification, or the user explicitly approved a labeled fallback
- all blocking questions were resolved
- the user explicitly approved the confirmation brief
- `SPECS.md` contains no contradictory goals, non-goals, or requirements
- each Must requirement is necessary, atomic, feasible, unambiguous, solution-neutral unless constrained, sourced, and testable
- acceptance criteria include applicable happy, negative/boundary, failure/recovery, and measurable quality coverage
- stable IDs and traceability links are valid with no orphan Must requirement or acceptance criterion
- assumptions and non-blocking open questions are visible
- external claims are current and cited
- repository claims have file references when useful
- the written file matches the approved brief
- no implementation or architecture work was performed

After saving, respond with:

- the `SPECS.md` path
- a one-sentence scope summary
- counts of functional requirements, non-functional requirements, and acceptance criteria
- remaining assumptions, risks, and non-blocking open questions
- research/verification subagents used
- any approved fallback or residual verification limitation
