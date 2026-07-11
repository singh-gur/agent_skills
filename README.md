# Agent Skills

This repository contains installable agent skills that can be added with the `npx skills` CLI.

## Available skills

### `super-plan`

Creates an implementation plan only and avoids making code changes while the skill is active.

Use it when you need help with:

- complex features
- refactors
- migrations
- architecture changes
- multi-step work that should be broken into clear phases

What it does:

- explores the repository before planning
- identifies constraints, risks, and open questions
- asks focused clarifying questions when needed
- writes a phased execution plan to `PLAN.md` or `plans/<task-name>.md`
- produces plans that are suitable for handoff to another agent or developer

Skill path in this repo:

- `super-plan/SKILL.md`

### `simple-plan`

Creates a concise implementation plan only for simple tasks that should fit in one phase.

Use it when you need help with:

- small, low-risk changes
- lightweight single-phase plans
- simple bug fixes or enhancements
- work that should be completed in one focused pass

What it does:

- explores only the directly relevant repository context
- asks clarifying questions only when needed
- writes a single-phase plan to `PLAN.md` or `plans/<task-name>.md`
- warns when a task may be too large while keeping the output constrained to a safe single-phase plan

Skill path in this repo:

- `simple-plan/SKILL.md`

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

## Install with `npx skills`

Install the `super-plan` skill from this repository:

```bash
npx skills add singh-gur/agent_skills --skill super-plan -g -y
```

Install the `simple-plan` skill from this repository:

```bash
npx skills add singh-gur/agent_skills --skill simple-plan -g -y
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

### Command breakdown

- `add` installs a skill from a repository
- `singh-gur/agent_skills` is the short GitHub reference for this repository
- `--skill super-plan` selects the skill to install
- `-g` installs it globally for your local setup
- `-y` auto-confirms the install

## Verify the repository contents

Current skills in this repo:

- `super-plan`
- `simple-plan`
- `caveman`
- `arch-design`
- `draw-diagram`

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
├── simple-plan/
│   └── SKILL.md
└── super-plan/
    └── SKILL.md
```
