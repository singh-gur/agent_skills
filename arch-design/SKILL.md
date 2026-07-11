---
name: arch-design
description: Produces a well-reasoned architecture design document with researched decisions, explicit trade-offs, suitable detail, and polished diagrams. Delegates all diagram tool selection, authoring, rendering, icon sourcing, routing, and visual-quality work to the companion draw-diagram skill so drawing improvements remain centralized. Use for architecture designs, system designs, HLDs, architecture proposals, and ADR-oriented design work.
compatibility: Requires web research and interactive question capabilities plus the companion `draw-diagram` skill installed alongside this skill. Diagram tool requirements are owned by `draw-diagram`.
metadata:
  author: gurbakhshish
  sources: https://agentskills.io and the companion draw-diagram skill in this repository
  spec: https://agentskills.io/specification
---

# Architecture Design

Produce a well-reasoned architecture design document with source-controlled, editable diagrams. Design only—do not implement the system while this skill is active unless the user explicitly changes the task.

## Required companion skill

All diagram behavior is owned by **`draw-diagram`**. This skill owns architecture discovery, decisions, trade-offs, document structure, and the semantic brief for each diagram; `draw-diagram` owns diagram tooling and execution.

Before planning, drafting, or rendering any diagram:

1. Load and read the complete `draw-diagram` skill using the environment's skill loader when available.
2. Otherwise resolve it relative to this file as `../draw-diagram/SKILL.md` and read it completely.
3. Follow its current instructions for tool choice, diagram notation, Iconify sourcing, editable sources, rendering, routing, inspection, output paths, and visual quality.
4. Treat `draw-diagram` as canonical. Do not reproduce or override its operational drawing instructions here.

If `draw-diagram` cannot be found, stop before diagram work and tell the user to install it:

```bash
npx skills add singh-gur/agent_skills --skill draw-diagram -g -y
```

Then wait for confirmation and load it. Do not silently substitute a local drawing workflow. Agent Skills has no formal dependency resolver, so this sibling dependency is convention-based and both skills must be installed.

## When to use

Use this skill when:

- the user wants an architecture design, system design, high-level design (HLD), or architecture proposal
- a new system, service, or major feature needs its shape decided before implementation
- the user needs technology trade-offs, component boundaries, interfaces, or non-functional decisions
- the work must align stakeholders or be handed to engineers to build
- key decisions should be captured as Architecture Decision Records (ADRs)

Do not use this skill for a standalone diagram with an already-decided design; use `draw-diagram` directly. Do not use it for an implementation plan with phases, or for trivial changes that need no architecture design.

## Core behavior

- **Design only.** Produce the architecture document and its diagram briefs/artifacts; do not build the system.
- **Clarify interactively.** Use the interactive question tool during discovery when missing requirements would change the design and again before the final proposal to confirm direction and key decisions. Do not silently assume.
- **Research first.** For frameworks, services, patterns, limits, pricing, versions, and comparisons, use current web sources rather than model memory. Cite claims that depend on current facts.
- **Simple and standard by default.** Prefer proven technology and the fewest moving parts that satisfy the requirements. Introduce complexity only when a concrete forcing function demands it.
- **Delegate drawing.** Define what each diagram must communicate, then apply the complete `draw-diagram` workflow. Never maintain a second copy of drawing mechanics in this skill.
- **Review before persistence.** Draft the design and semantic diagram briefs, walk the user through them, and write the document and diagram artifacts only after approval unless the user explicitly requests immediate generation.

## Design principles

- **Prefer standard, proven technology.** Justify every non-standard choice explicitly.
- **Prefer fewer moving parts.** Merge components that do not need to scale, deploy, secure, or evolve independently.
- **Prefer managed/serverless over self-hosted** unless control, cost, compliance, portability, or performance demands otherwise; name the reason.
- **Make complexity pay for itself.** Microservices, event sourcing, CQRS, sharding, multi-region, custom protocols, and similar patterns require a concrete non-functional requirement or constraint.
- **Record key decisions as ADRs.** Capture context, options considered, the decision, consequences, and trade-offs.
- **Make assumptions and risks explicit.** Never hide a load-bearing assumption.
- **Separate concerns from products.** Establish required capabilities and constraints before selecting vendors or frameworks.
- **Design failure behavior.** Address retries, idempotency, timeouts, degradation, recovery, and operational ownership where relevant.

## Research-first rule

- Use `web_search` with varied query angles and `fetch_content` to ground current, version-specific choices.
- Prioritize official documentation and release notes for APIs, limits, quotas, pricing, regions, and supported versions.
- Cite sources wherever a claim depends on a version, limit, price, or current service capability.
- Mark unsupported claims as assumptions instead of presenting guesses as facts.
- Separate observed repository facts, researched facts, user-provided constraints, and assumptions.

## Architecture workflow

1. **Understand the request.**
   - Restate the goal, scope, audience, constraints, success criteria, and expected decision horizon.
   - Identify functional requirements and non-functional requirements such as scale, latency, availability, security, cost, compliance, operability, and portability.
   - Inspect the existing system or repository before asking questions.

2. **Load the diagram dependency.**
   - Load and read `draw-diagram` completely using the required companion-skill procedure above.
   - Do this before choosing diagram tools, icons, formats, layouts, or renderers.

3. **Discovery and research.**
   - Map current components, integrations, data, ownership, conventions, constraints, and known pain points.
   - Research current options and forcing functions using authoritative sources.
   - Ask focused questions for ambiguities that materially change scope, topology, technology, or non-functional behavior.

4. **Choose the detail level.**
   - Ask the user to choose **Early Draft**, **POC Ready**, or **Implementation Ready**.
   - Explain the minimum useful level for their audience and purpose. If unanswered, default to **POC Ready**.

5. **Develop candidate architecture.**
   - Start with the simplest viable structure.
   - Identify components, responsibilities, boundaries, interfaces, data ownership, runtime interactions, deployment assumptions, and operational concerns.
   - Compare meaningful alternatives and state why rejected options lose under the known constraints.

6. **Propose the direction and confirm.**
   - Present the candidate architecture, technology choices, major flows, trade-offs, risks, assumptions, and open decisions.
   - Use the interactive question tool to confirm direction before drafting the full document.

7. **Prepare semantic diagram briefs.**
   - For each diagram required by the selected detail level, state the question it answers, audience, abstraction level, nodes, boundaries, relationships, important labels, and critical happy/failure paths.
   - Keep each brief semantically consistent with the proposed architecture and prose.
   - Pass these briefs to the loaded `draw-diagram` workflow; let that skill choose and explain drawing tools, notation, routing, icons, formats, and rendering details.

8. **Draft and review.**
   - Draft the architecture document and intended diagram briefs without writing files.
   - Walk the user through the full Early Draft or a faithful section summary for larger levels, including proposed save paths.
   - Revise until explicitly approved.

9. **Write the document and create diagrams.**
   - After approval, treat the approved semantic briefs as approved drawing specifications and execute them with `draw-diagram`.
   - Follow `draw-diagram` completely for source creation, icon provenance, rendering, inspection, and iteration.
   - Reference final rendered assets from the architecture document and keep terminology synchronized.
   - Write the document to the agreed location only after the approved content and diagrams are ready.

10. **Handle material changes.**
    - When components, boundaries, relationships, flow, topology, or technology choices change, update the architecture prose and semantic briefs.
    - Reapply `draw-diagram` to regenerate and inspect every affected artifact.

## Detail levels

Choose the lowest level that satisfies the user's purpose.

### Level 1 — Early Draft

- **Goal:** fast alignment on direction and scope; not yet implementable.
- **Audience:** stakeholders and early technical review.
- **Typical diagram briefs:** one high-level conceptual/system-context view; optionally one concise runtime-flow view when behavior is the central question.
- **Sections:**
  - Problem & Goals
  - Scope (in / out)
  - High-level components
  - Key assumptions
  - Options considered (brief)
  - Open questions

### Level 2 — POC Ready

- **Goal:** enough detail to build a proof of concept or technical spike.
- **Audience:** engineers building the POC.
- **Typical diagram briefs:** conceptual/context, component and data flow, and one appropriate runtime/control-flow view; add one use-case-specific view when it answers a material question.
- **Sections:** everything in Early Draft, plus:
  - Component responsibilities and boundaries
  - Technology choices and researched rationale
  - Data flow
  - Key interface/contract sketches
  - High-level non-functional requirements
  - Risks and trade-offs

### Level 3 — Implementation Ready

- **Goal:** engineers can implement without rediscovering major design decisions.
- **Audience:** implementation and operations teams.
- **Typical diagram briefs:** conceptual/context, component and data flow, critical runtime/control flows, and the relevant deployment, data model, security, integration, resilience, or observability views.
- **Sections:** everything in POC Ready, plus:
  - Detailed component contracts and APIs
  - Data model/schema
  - Deployment and topology
  - Scaling and capacity
  - Security and compliance
  - Observability
  - Failure modes and resilience
  - Migration and rollout
  - ADRs for key decisions
  - Test strategy

Do not gold-plate an Early Draft with implementation-ready detail unless requested.

## Architecture document requirements

Every applicable design should make these explicit:

- problem, goals, non-goals, scope, audience, and success criteria
- observed facts, user constraints, and assumptions
- component responsibilities, ownership, and boundaries
- key interfaces, data ownership, and important runtime flows
- technology decisions with evidence and alternatives
- non-functional requirements and forcing functions
- security, reliability, scalability, cost, and operability considerations proportional to the chosen detail level
- risks, trade-offs, unresolved questions, and ADRs
- references to diagram artifacts created through `draw-diagram`
- current sources for version-, limit-, and price-dependent claims

## Output location

Ask where to save the architecture document before writing. Defaults:

- `docs/architecture.md`
- `docs/architecture/<name>.md`

Let `draw-diagram` own diagram source, rendered asset, and icon paths. Record the paths it selects and reference rendered assets correctly from the architecture document. Adapt to established repository conventions.

## Quality bar

A good architecture design should:

- be grounded in researched evidence and observed system/repository facts
- choose the simplest standard approach that meets explicit requirements
- justify complexity with concrete forcing functions
- make boundaries, ownership, contracts, data flow, assumptions, trade-offs, and risks explicit
- use diagrams whose semantics match the prose and whose visual quality passes `draw-diagram`
- cite current sources for factual claims that can change
- match the selected detail level without padding
- be actionable for its intended audience without pretending unresolved assumptions are decisions

## Important rules

- Load `draw-diagram` completely before any diagram decision or work.
- Treat `draw-diagram` as the sole source of truth for drawing behavior; do not duplicate its instructions here.
- If the companion skill is unavailable, stop diagram work, provide the install command, and wait.
- Design only unless the user explicitly changes the task.
- Clarify during discovery and confirm direction before the final proposal.
- Ask for the detail level before drafting.
- Research current facts and cite authoritative sources.
- Prefer simple, standard solutions; name every forcing function for complexity.
- Review the architecture and semantic diagram briefs before writing files unless immediate generation is explicitly requested.
- Keep prose and diagrams synchronized after every material change.
- After saving, report concise paths for the architecture document and all diagram artifacts.
