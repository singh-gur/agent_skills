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

## Source layout

```text
.
├── README.md
├── caveman/
│   └── SKILL.md
├── simple-plan/
│   └── SKILL.md
└── super-plan/
    └── SKILL.md
```
