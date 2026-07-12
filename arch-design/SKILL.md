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
- **Use a deterministic diagram set.** Select diagrams from the chosen detail level's required and conditional views. Do not vary the baseline set between runs without a stated reason.
- **Keep diagrams visual.** Use short, intuitive component names and relationship labels. Put responsibilities, rationale, constraints, and other drill-down detail in the architecture Markdown rather than inside diagram nodes.
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
   - Use the required diagram set for that level. Add a conditional view only when its inclusion trigger applies, and state that trigger in the proposal.

5. **Develop candidate architecture.**
   - Start with the simplest viable structure.
   - Identify components, responsibilities, boundaries, interfaces, data ownership, runtime interactions, deployment assumptions, and operational concerns.
   - Compare meaningful alternatives and state why rejected options lose under the known constraints.

6. **Propose the direction and confirm.**
   - Present the candidate architecture, technology choices, major flows, trade-offs, risks, assumptions, and open decisions.
   - Use the interactive question tool to confirm direction before drafting the full document.

7. **Prepare semantic diagram briefs.**
   - For each diagram required by the selected detail level, state the question it answers, audience, abstraction level, nodes, boundaries, relationships, important labels, and critical happy/failure paths.
   - Classify each view as required or conditional and, for a conditional view, record why it applies.
   - Specify concise display names separately from full component responsibilities. Diagram nodes should normally use a recognizable noun or short noun phrase; detailed explanations belong in the matching Markdown section.
   - For the functional system components/infrastructure view, identify the recognizable icon category for each major building block. Do the same for a high-level system view when icons materially improve first-glance recognition. Keep text labels because icons supplement rather than replace names.
   - Keep each brief semantically consistent with the proposed architecture and prose.
   - Pass these briefs to the loaded `draw-diagram` workflow; let that skill choose and explain drawing tools, notation, routing, exact icons, formats, and rendering details.

8. **Draft and review.**
   - Draft the architecture document and intended diagram briefs without writing files.
   - Walk the user through the full Early Draft design or a faithful section summary for larger levels, including proposed save paths.
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

Choose the lowest level that satisfies the user's purpose. The listed **required** diagrams are the stable baseline for every run at that level. Create a **conditional** diagram only when its trigger applies; do not add diagrams merely to make the document look comprehensive.

### Level 1 — Early Draft

- **Goal:** align on the system idea, scope, and conceptual operation; not yet implementable.
- **Audience:** stakeholders and early technical reviewers.
- **Required diagram — High-level system design:** show the system boundary, users or external actors, the few conceptual components needed to understand how the system works, and their primary interactions. Avoid product-level deployment detail.
- **Conditional diagram — Simple functional system components/infrastructure view:** include when deployment shape, a major managed service, an external platform, or an infrastructure constraint affects feasibility. Show only the main compute, entry point, data store, messaging, and external-service building blocks that apply.
- **Sections:**
  - Problem & Goals
  - Scope (in / out)
  - High-level components and how they collaborate
  - Key assumptions
  - Options considered (brief)
  - Open questions

### Level 2 — POC Ready

- **Goal:** provide enough detail to build and evaluate a proof of concept or technical spike.
- **Audience:** engineers building the POC.
- **Required diagram — Detailed high-level system design:** expand the Early Draft view with meaningful internal boundaries, conceptual component responsibilities, external integrations, and primary interaction directions while remaining technology-light.
- **Required diagram — Functional system components/infrastructure view:** show a workable POC topology with the concrete runtime building blocks, services, gateways, compute, stores, queues or event brokers, and external dependencies that actually apply. Show boundaries and key connections, but leave configuration detail to Markdown.
- **Conditional diagram — Simple data/event flow:** include when data transformation, asynchronous messaging, ordering, fan-out, or movement between stores is important to proving the design. Show the primary happy path only unless a failure path is central to the POC.
- **Sections:** everything in Early Draft, plus:
  - Component responsibilities and boundaries
  - Technology choices and researched rationale
  - Data or event flow
  - Key interface/contract sketches
  - High-level non-functional requirements
  - Risks and trade-offs

### Level 3 — Implementation Ready

- **Goal:** enable implementation and operation without rediscovering major design decisions.
- **Audience:** implementation and operations teams.
- **Required diagram — Detailed high-level system design:** provide the complete conceptual view with all implementation-significant domains, actors, external systems, ownership boundaries, and primary interactions.
- **Required diagram — Detailed functional system components/infrastructure view:** provide a deployable topology with runtime units, managed services, network or trust boundaries, stores, messaging, external dependencies, scaling units, and availability placement where relevant.
- **Required diagrams — Working flows:** show every critical request, data, event, or control flow needed to implement the system. Use separate views for materially different flows; include important alternate or failure behavior where it changes implementation.
- **Conditional diagrams — Use-case-specific views:** add deployment, data model, security/trust boundary, integration, resilience, observability, migration, or state/lifecycle views only when they resolve an implementation-significant question not already clear from the required diagrams and Markdown.
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

Do not gold-plate an Early Draft with POC- or implementation-ready detail unless requested.

## Diagram content rules

Apply these rules at every detail level:

- A diagram is a visual index into the design, not a replacement for the design document.
- Use intuitive, purpose-revealing names such as `API Gateway`, `Order Service`, `Event Bus`, or `Audit Store`; avoid sentences, implementation notes, and unexplained abbreviations in nodes.
- Keep node text to a name and, only when essential, one short qualifier. Put responsibilities, technology rationale, protocols, schemas, configuration, scaling behavior, and caveats in Markdown.
- Label only relationships whose meaning is not obvious. Prefer short verbs or compact data/event names over descriptive sentences.
- Keep each diagram at one abstraction level and focused on one question. Split it when extra text is needed to explain mixed concerns.
- In the Markdown, provide a matching component or flow section that lets readers drill down from each diagram name into responsibilities, interfaces, decisions, and operational detail.
- Use recognizable icons for major building blocks in every functional system components/infrastructure diagram. Use icons in a high-level system diagram when they make actors, stores, messaging, compute, or external platforms easier to recognize at first glance. Follow `draw-diagram` for exact icon selection, provenance, rendering, and accessibility.
- Never use an icon without a concise text label, and never use decorative icons that do not improve recognition.

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
- use the selected level's stable required diagram set and justify every conditional view
- use concise, recognizable diagram labels with Markdown as the drill-down layer
- use diagrams whose semantics match the prose and whose visual quality passes `draw-diagram`
- make functional system components/infrastructure views informative at first glance through purposeful icons and labels
- cite current sources for factual claims that can change
- match the selected detail level without padding
- be actionable for its intended audience without pretending unresolved assumptions are decisions

## Important rules

- Load `draw-diagram` completely before any diagram decision or work.
- Treat `draw-diagram` as the sole source of truth for drawing behavior; do not duplicate its instructions here.
- If the companion skill is unavailable, stop diagram work, provide the install command, and wait.
- Design only unless the user explicitly changes the task.
- Clarify during discovery and confirm direction before the final proposal.
- Ask for the detail level before drafting and use its required diagram baseline consistently.
- Keep explanatory detail in Markdown; keep diagrams concise, visual, and single-purpose.
- Require purposeful icons plus labels in functional system components/infrastructure views, and use them in high-level views when they improve recognition.
- Research current facts and cite authoritative sources.
- Prefer simple, standard solutions; name every forcing function for complexity.
- Review the architecture and semantic diagram briefs before writing files unless immediate generation is explicitly requested.
- Keep prose and diagrams synchronized after every material change.
- After saving, report concise paths for the architecture document and all diagram artifacts.
