---
name: skill-writer
description: Creates or revises Agent Skills through iterative refinement, current official-spec research, repository and tool inspection, focused user questions, and explicit full-draft approval before writing. Use when asked to create, author, design, improve, or update a skill, skill package, or SKILL.md.
compatibility: Requires internet access to verify the current Agent Skills specification before writing and an interactive way to obtain user approval.
metadata:
  author: gurbakhshish
  spec: https://agentskills.io/specification
---

# Skill Writer

Create or revise a portable Agent Skill only after the user has reviewed and approved its exact contents.

## Non-negotiable behavior

- Check `https://agentskills.io/specification` during every run. Treat the fetched specification as authoritative over memory, examples, client leniencies, and this skill.
- If the specification cannot be checked, continue discovery if useful but do not write or modify skill files.
- Follow the strict cross-client specification. Add client-specific behavior only when the user requests it, and identify it in the approval draft.
- Inspect supplied material, repository context, and existing skill files before asking questions they can answer.
- Repeat the **refine → research → ask** loop only while material gaps remain.
- Present the complete proposed file tree and full contents of every new or modified file before writing.
- Require explicit user approval. A request to revise, discuss, or answer questions is not approval.
- If approved content changes afterward, present the changed draft and obtain approval again.
- Write only files included in the approved draft.

## Subagents

At the start of the **refine → research → ask** loop, check whether subagents are available and inspect their roles before delegating.

Use available subagents for bounded, independent work when doing so materially improves speed, coverage, or confidence, such as:

- inspecting separate areas of repository or supplied context
- researching independent external questions
- identifying ambiguities and candidate user questions
- reviewing the proposed skill for specification compliance, portability, or gaps

Give each subagent a distinct assignment. Prefer parallel read-only research or review; keep one parent-controlled write path. Do not create pointless fanout, delegate competing drafts, or ask ordinary subagents to orchestrate more subagents.

Subagents may return findings and suggest questions, but the parent agent must synthesize the results, make recommendations, ask the user for consequential decisions, and obtain final approval. If delegation would not help, continue without it.

## Workflow

### 1. Capture the idea

Extract what is already known from the request and conversation:

- capability and intended outcome
- trigger phrases and contexts
- expected inputs and outputs
- required workflow or decision points
- target users and supported clients
- tools, dependencies, and environment constraints
- safety, privacy, or permission boundaries
- examples of success and failure
- whether this is a new skill or a revision

For an existing skill, read its `SKILL.md` and directly referenced resources before proposing changes. Preserve behavior that the user has not asked to change.

### 2. Inspect available context

Inspect the target repository, nearby skills, conventions, installed tools, and relevant source files. Reuse existing patterns and resources when they fit, but do not copy stale constraints over the current official specification.

Do not access credentials, secrets, or unrelated private data. Ask for sanitized examples when sensitive input is needed.

### 3. Verify the current specification

Fetch and read:

- `https://agentskills.io/specification`

Record which requirements affect the proposed skill. Follow official links only when needed to resolve validation or format details.

At minimum, verify the current rules for:

- skill directory and `SKILL.md`
- required and optional frontmatter
- name and directory matching
- description constraints
- body and progressive-disclosure guidance
- resource directories and file references
- validation

Do not rely on a previously cached summary when the current page is reachable.

### 4. Research material unknowns

Research only facts that could change the skill’s behavior, structure, instructions, dependencies, safety, or user choices.

Use the best available tools:

- repository inspection for existing behavior and conventions
- web search and page fetching for current external facts
- official documentation and primary sources before secondary sources
- browser automation when interaction or rendered-page inspection is necessary

Keep research proportional. Stop when more research is unlikely to change the next question or draft. Retain source links for material external claims.

### 5. Refine the working brief

Maintain a concise working brief containing:

- purpose
- trigger conditions and near-misses
- inputs and outputs
- step-by-step behavior
- scope and non-goals
- tools and dependencies
- error and edge-case handling
- safety and permission boundaries
- portability requirements
- success checks
- assumptions and open decisions
- proposed output path

Prefer the smallest skill package that satisfies the brief. Start with one `SKILL.md`; add `scripts/`, `references/`, or `assets/` only when they remove repeated work or keep necessary detail out of the main instructions.

### 6. Ask focused questions

Ask only questions the user is best placed to answer.

- Ask 2–5 related questions per round.
- Prefer concrete choices with a recommendation when trade-offs are understood.
- Explain only the consequences needed to choose.
- Prioritize behavior, scope, output, triggers, safety, dependencies, and portability.
- Summarize the answers and update the working brief.

Repeat **refine → research → ask** when an answer creates a material unknown or changes scope. Do not repeat the loop for wording that can be safely drafted and reviewed.

The draft is ready when:

- the purpose and trigger conditions are unambiguous
- expected inputs, outputs, and workflow are defined
- scope, non-goals, and important edge cases are clear
- required tools and environment assumptions are known
- no material choice is being invented on the user’s behalf
- the proposed structure follows the current specification

### 7. Draft the skill

Draft instructions in imperative, direct language. Explain why constraints matter when that improves judgment; avoid piling up rigid rules without context.

Apply progressive disclosure:

- make the frontmatter description specific enough to trigger correctly
- keep `SKILL.md` focused and under the current recommended limits
- move detailed or domain-specific material into directly referenced resources
- keep references shallow and relative to the skill root
- include scripts only for deterministic or repeatedly reimplemented work
- include examples and edge cases only when they clarify behavior

Do not add speculative abstractions, dependencies, files, or configuration.

### 8. Present the approval draft

Present:

1. the specification URL and whether it was successfully checked
2. the final working brief
3. the proposed file tree
4. the complete contents of every new or modified file
5. files to remove, if any
6. the validation plan
7. any client-specific extensions or unresolved risks

Ask the user to choose:

- **Approve and write**
- **Revise**
- **Answer remaining questions**
- **Cancel**

Do not write files before explicit approval.

### 9. Write exactly what was approved

After approval:

- read existing target files again before modifying them
- create or edit only the approved paths
- preserve unrelated content
- do not silently improve or expand the approved draft
- stop and reconfirm if a conflict requires different content

### 10. Validate

Validate against the specification fetched during this run.

Check at least:

- directory name equals the frontmatter `name`
- required frontmatter exists and satisfies current constraints
- optional frontmatter uses supported types and limits
- `SKILL.md` and referenced resource paths exist
- references are relative and follow current depth guidance
- the main file follows current progressive-disclosure guidance
- no unapproved files were written

Use an already available compatible validator when practical. The official `skills-ref` library may be used as a reference check, but it is not production tooling. Do not install a validator or add a project dependency solely for this check without user approval.

If validation requires a content change, show the exact correction and obtain approval before editing.

## Completion

Report:

- written or modified paths
- specification URL checked
- validation performed and result
- any remaining warning or portability limitation

Do not implement the skill’s subject-matter task while authoring the skill unless the user separately requests it.
