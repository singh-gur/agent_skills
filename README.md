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

## Install with `npx skills`

Install the `super-plan` skill from this repository:

```bash
npx skills add singh-gur/agent_skills --skill super-plan -g -y
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

## Source layout

```text
.
├── README.md
└── super-plan/
    └── SKILL.md
```
