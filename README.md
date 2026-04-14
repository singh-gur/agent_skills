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
npx skills add https://github.com/singh-gur/agent_skills.git --skill super-plan -g --agent pi -y
```

### Command breakdown

- `add` installs a skill from a repository
- `https://github.com/singh-gur/agent_skills.git` is this repository
- `--skill super-plan` selects the skill to install
- `-g` installs it globally for your local agent setup
- `--agent pi` installs it for the `pi` agent
- `-y` auto-confirms the install

## Install for another agent

If you use a different compatible agent runtime, change the `--agent` value:

```bash
npx skills add https://github.com/singh-gur/agent_skills.git --skill super-plan -g --agent <agent-name> -y
```

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
