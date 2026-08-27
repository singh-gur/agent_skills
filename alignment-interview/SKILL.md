---
name: alignment-interview
description: Conducts a rigorous, adaptive interview to establish shared understanding before action. Uses an intake → research → ask loop, dependency-aware question rounds, recommendations, contradiction checks, and explicit confirmation. Use when the user asks to be interviewed or grilled, wants to clarify an idea, decision, or task, needs assumptions uncovered, or wants alignment before planning or execution.
compatibility: Requires interactive user input. Benefits from repository inspection and web research when relevant facts are externally discoverable.
metadata:
  author: gurbakhshish
  inspired-by: https://github.com/mattpocock/skills
  spec: https://agentskills.io/specification
---

# Alignment Interview

Interview the user until both sides share a sufficiently complete understanding of the subject. Gather only information that could materially affect the outcome, scope, decisions, constraints, or next action.

## Boundaries

- Interview only. Do not implement, plan, write files, or act on the conclusions while this skill is active.
- Let the user narrow, pause, or end the interview at any time.
- Do not invent answers to unresolved decisions.
- Do not demand exhaustive detail when it cannot affect the result.
- Never retrieve secrets or unrelated sensitive information. Request sanitized examples when necessary.

## Core loop

Repeat **intake → research → ask** until the completion conditions are met.

### 1. Intake

Extract what is already known from the request and conversation. Maintain a compact alignment map containing only relevant parts of:

- desired outcome and underlying problem
- users, stakeholders, and affected parties
- current context
- in-scope and out-of-scope boundaries
- constraints and priorities
- important behavior or decisions
- assumptions
- success and failure signals
- known risks and edge cases
- unknown facts
- unresolved user decisions

Do not ask again for information already supplied.

Represent material decisions as a dependency tree. A question is ready only when its prerequisite decisions and facts are settled.

### 2. Research

Resolve discoverable facts before asking the user.

Use supplied material, repository inspection, available tools, and authoritative external sources when relevant. Delegate bounded research when doing so materially improves speed or confidence.

- Research only facts that could change the interview or shared-understanding brief.
- Prefer direct evidence and primary sources.
- Distinguish observed facts from inference.
- Do not ask the user to inspect something the agent can inspect.
- When research can run concurrently, continue asking questions that do not depend on it.
- If a fact cannot be verified, expose the uncertainty and its consequence.

Facts are the agent's responsibility. Preferences, priorities, trade-offs, and scope decisions belong to the user.

### 3. Ask

Compute the current **frontier**: the material questions whose prerequisites are settled and whose answers do not depend on another open question in the same round.

Ask the whole useful frontier, normally 2–5 questions. There is no fixed total question limit. Use one question when the user requests a sequential interview or when the next decision depends on it.

For each question:

- number and title it
- explain the decision and only the context needed to answer
- offer concrete choices when useful
- give a recommended answer and concise reason
- state the consequence when the choice materially changes the result

Use this format:

```text
Q1 — <Title>

<Question and relevant choices>

Recommendation: <recommended answer and brief reason>
```

Questions in one round must be independent. Put dependent questions in a later round.

Challenge:

- vague or internally inconsistent answers
- hidden assumptions
- solution-first framing that leaves the outcome unclear
- contradictions between scope, constraints, and success signals
- happy-path answers that ignore a material failure case

Use concrete examples, counterexamples, and “what would happen if” questions when they expose ambiguity. Do not argue merely to make the interview feel rigorous.

### 4. Reconcile

After each response:

1. update the alignment map
2. summarize newly settled decisions when useful
3. identify contradictions or reopened branches
4. research newly introduced factual unknowns
5. recompute the frontier
6. ask the next round

Do not follow a prewritten questionnaire. Later questions should reflect earlier answers.

## Completion conditions

The interview is ready to conclude when:

- the desired outcome and underlying problem are clear
- relevant users and stakeholders are understood
- scope and non-goals are explicit
- material constraints and priorities are known
- success and important failure conditions are defined
- consequential decisions are resolved or deliberately left open
- important assumptions, risks, and edge cases are visible
- discoverable facts have been researched sufficiently
- no unresolved contradiction remains
- no remaining question could materially change the shared understanding

“Complete” means sufficient for the intended next action, not exhaustive knowledge of the subject.

## Confirmation

Present a concise **Shared-Understanding Brief** containing the applicable sections:

- objective and problem
- context and stakeholders
- scope and non-goals
- requirements and decisions
- constraints and priorities
- success and failure signals
- assumptions and supporting evidence
- risks and edge cases
- unresolved items

Then ask the user to choose:

- **Confirm shared understanding**
- **Revise the brief**
- **Continue the interview**
- **Stop with unresolved items**

The interview is not complete until the user explicitly confirms the brief. If the user requests changes, update the alignment map and resume the loop.

After confirmation, stop and return control to the user. Do not begin the original task.

## Difficult cases

- If the user does not know an answer, determine whether it can be researched, accepted as an assumption, or requires an experiment or later decision.
- If discussion cannot settle an empirical question, recommend the smallest useful investigation and record it as unresolved.
- If the subject is too broad, expose the branches and ask the user which slice to align on first.
- If the user asks to wrap up early, present the brief with a clear unresolved-items section and request confirmation.
- If evidence conflicts with the user's premise, explain the conflict and its consequence without silently overriding the user's decision.

## Quality check

A successful interview should show that:

- questions changed in response to earlier answers
- each question could materially affect the brief
- facts were researched instead of delegated to the user
- recommendations made trade-offs easier to evaluate
- contradictions were resolved or explicitly retained
- the final brief contains no silent material assumptions
- the user explicitly confirmed the shared understanding
