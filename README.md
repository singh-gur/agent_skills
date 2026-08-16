# Agent Skills

This repository contains installable agent skills that can be added with the `npx skills` CLI.

## Available skills

### `plan`

Creates an implementation plan only and avoids making code changes while the skill is active. Gauges task complexity to pick between a single-phase plan (simple work) and a phased plan (complex work), asking the user when the choice is unclear.

Use it when you need help with:

- small, low-risk changes that fit one focused pass
- simple bug fixes or enhancements
- complex features, refactors, migrations, or architecture changes
- multi-step work that should be broken into clear phases

What it does:

- explores the repository before planning
- identifies constraints, risks, and open questions
- asks focused clarifying questions when needed
- selects single-phase or phased mode based on complexity, with a user check when ambiguous
- writes the plan to `PLAN.md` or `plans/<task-name>.md`
- produces plans that are suitable for handoff to another agent or developer

Skill path in this repo:

- `plan/SKILL.md`

### `caveman`

Enables ultra-compressed communication mode while preserving technical accuracy.

Use it when you need help with:

- shorter agent responses
- lower token usage
- caveman-style concise prose
- optional `lite`, `full`, or `ultra` compression levels

What it does:

- drops filler, pleasantries, articles, and hedging where safe
- keeps technical terms, code blocks, symbols, and quoted errors exact
- persists until stopped with `stop caveman` or `normal mode`
- temporarily returns to clearer prose when compression could create ambiguity

Skill path in this repo:

- `caveman/SKILL.md`

### `arch-design`

Produces a well-reasoned architecture design document and delegates diagram creation to the companion `draw-diagram` skill.

Use it when you need help with:

- designing the architecture of a new system, service, or major feature
- high-level design (HLD), system design, or architecture proposals
- technology tradeoffs, component breakdowns, and architecture diagrams
- aligning stakeholders before implementation

What it does:

- researches current best practices via web search/fetch instead of relying on memory
- clarifies requirements interactively at discovery and before the final proposal
- offers Early Draft, POC Ready, and Implementation Ready detail levels
- prefers simple, standard, boring technology; only chooses complexity when a concrete need forces it
- defines the architecture semantics and briefs for required diagrams
- loads `draw-diagram` as the canonical workflow for tool selection, icons, editable source, rendering, routing, and visual inspection
- keeps architecture prose and delegated diagram artifacts synchronized on material change

Skill path in this repo:

- `arch-design/SKILL.md`

### `draw-diagram`

Creates polished, editable diagrams without requiring a full architecture-design workflow.

Use it when you need help with:

- architecture, conceptual, component, or data-flow diagrams
- sequence, control-flow, process, state, or lifecycle diagrams
- deployment, network, ER/data-model, trust-boundary, migration, or observability views
- recreating or improving an existing diagram with cleaner layout and routing

What it does:

- recommends Excalidraw first and offers D2 as a text-based alternative
- preserves editable source and renders Excalidraw PNGs or bundled D2 SVGs
- uses Iconify icons with local vendoring, safety checks, and license provenance
- prioritizes visual fidelity, orthogonal connectors, readable spacing, and routes that avoid text and components
- lets the user choose among installed D2 layout engines after receiving explanations and a recommendation
- inspects every rendered asset and iterates until semantic and visual quality pass
- includes its own pinned, network-blocked Excalidraw renderer

Skill path in this repo:

- `draw-diagram/SKILL.md`

### `spec-writer`

Turns a raw idea into a concise, approved `SPECS.md` handoff for architecture or implementation planning.

Use it when you need help with:

- refining an incomplete or ambiguous feature request
- researching repository and external constraints only where they matter
- fleshing out the idea through a refine → research → ask loop
- clarifying essential requirements, scope, constraints, and success signals
- producing a compact handoff for `arch-design` or `plan`

What it does:

- inspects available context and refines the raw idea
- researches only material unknowns before asking focused questions
- repeats the loop only when answers expose important new uncertainty
- keeps the final brief to roughly 50–150 lines by default
- leaves architecture and implementation detail to the next skill
- writes `SPECS.md` only after explicit confirmation

Skill path in this repo:

- `spec-writer/SKILL.md`

### `skill-writer`

Creates or revises portable Agent Skills through an approved, specification-driven workflow.

Use it when you need help with:

- turning a rough capability idea into a skill
- researching domain and tooling requirements
- refining triggers, scope, workflow, and outputs
- updating an existing skill without changing unrelated behavior
- validating a skill against the current Agent Skills specification

What it does:

- checks `https://agentskills.io/specification` during every run
- repeats a focused refine → research → ask loop until material gaps are resolved
- proposes the smallest useful skill package
- shows the complete file tree and contents before writing
- requires explicit approval, then writes and validates only the approved files

Skill path in this repo:

- `skill-writer/SKILL.md`

### `dispatch`

Complexity-tiered model routing for subagent delegation via `pi-subagents`. Classifies each delegated subtask into a tier (T1 trivial read-only, T2 normal, T3 hard/multi-file/safety-critical) and launches it on the model configured for that tier. Explicit invocation only.

Use it when you need:

- cheaper models on trivial subagent tasks and flagships only on hard ones
- per-project or global tier-to-model configuration with an interactive model picker
- caveman-style session toggle (`/skill:dispatch on|off|manual`)

What it does:

- routes subagent launches by task type + blast radius rubric
- reads model lists from `~/.pi/agent/models-store.json` for an `ask_user` picker
- stores settings in `~/.pi/agent/dispatch/settings.json` (global) or `<repo>/.pi/dispatch/settings.json` (project)
- supports session-only overrides (`set T2 <model>`), one-shot tiers, and `status`/`reset`

Requires the `pi-subagents` package. Skill path in this repo: `dispatch/SKILL.md`

## Install with `npx skills`

Install the `plan` skill from this repository:

```bash
npx skills add singh-gur/agent_skills --skill plan -g -y
```

Install the `caveman` skill from this repository:

```bash
npx skills add singh-gur/agent_skills --skill caveman -g -y
```

Install the standalone `draw-diagram` skill from this repository:

```bash
npx skills add singh-gur/agent_skills --skill draw-diagram -g -y
```

Install `arch-design` together with its required `draw-diagram` companion:

```bash
npx skills add singh-gur/agent_skills --skill draw-diagram -g -y
npx skills add singh-gur/agent_skills --skill arch-design -g -y
```

Agent Skills does not provide a formal dependency resolver, so both commands are required.

Install the `spec-writer` skill from this repository:

```bash
npx skills add singh-gur/agent_skills --skill spec-writer -g -y
```

Install the `skill-writer` skill from this repository:

```bash
npx skills add singh-gur/agent_skills --skill skill-writer -g -y
```

Install the `dispatch` skill from this repository:

```bash
npx skills add singh-gur/agent_skills --skill dispatch -g -y
```

### Command breakdown

- `add` installs a skill from a repository
- `singh-gur/agent_skills` is the short GitHub reference for this repository
- `--skill <name>` selects the requested skill, such as `plan` or `spec-writer`
- `-g` installs it globally for your local setup
- `-y` auto-confirms the install

## Verify the repository contents

Current skills in this repo:

- `plan`
- `caveman`
- `arch-design`
- `draw-diagram`
- `spec-writer`
- `skill-writer`

## Source layout

```text
.
├── README.md
├── arch-design/
│   └── SKILL.md
├── caveman/
│   └── SKILL.md
├── draw-diagram/
│   ├── SKILL.md
│   └── scripts/
│       └── excalidraw-renderer/
│           ├── index.html
│           ├── package.json
│           ├── package-lock.json
│           ├── render.mjs
│           └── renderer-browser.js
├── plan/
│   └── SKILL.md
├── spec-writer/
│   ├── SKILL.md
│   └── templates/
│       └── SPECS.template.md
└── skill-writer/
    └── SKILL.md
```
