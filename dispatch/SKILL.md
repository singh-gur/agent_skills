---
name: dispatch
description: >
  Complexity-based subagent dispatching. Classifies each delegated subtask into a tier
  (T1 trivial read-only, T2 normal, T3 hard/multi-file/safety-critical) and routes it to
  the model configured for that tier via pi-subagents. Toggle with "dispatch on" /
  "dispatch off"; configure with "dispatch settings". Explicit invocation only.
disable-model-invocation: true
metadata:
  author: gurbakhshish
  source: custom
  spec: https://agentskills.io/specification
---

# Dispatch

Complexity-tiered model routing for subagent launches. Parent stays orchestrator; this
skill only changes WHICH model/agent each child launch uses.

## Persistence

Session state: `mode` (off|on|manual), `sessionOverrides` (tier -> model), and
`oneShotTier` (if set). OFF by default each session. Active only when the user enables
it or has enabled it earlier this session. If this skill is loaded and no mode was set
yet, mode is OFF until "dispatch on".

Keep state current across the whole session. Do not revert mode after many turns.

## Commands

Parse the user's argument after `/skill:dispatch`:

| Command | Action |
|---|---|
| `on` | Enable auto-routing. Bootstrap tier agents if missing (see below). Confirm in one line. |
| `off` (or "stop dispatching") | Disable routing; dispatch subagents normally. Confirm in one line. |
| `manual` | Routing on, but before each launch propose tier + model and wait for user confirmation. |
| `status` | Show: mode, effective config per tier (model, thinking, source of value: session override / project / global / default), any pending one-shot. |
| `settings [global\|project]` | Interactive configuration. See Settings flow. |
| `set T1\|T2\|T3 <model-id>` | Session-only model override for a tier. |
| `unset T1\|T2\|T3` | Clear session override for a tier. |
| `reset` | Delete the project settings file (fall back to global). Confirm first; never touch global without an explicit `reset global`. |
| `T1\|T2\|T3 <task...>` | Set one-shot tier for the next delegation, then delegate/queue the task. Clears after one use. |
| no argument | Same as `status`. |

## Settings files

- Global: `~/.pi/agent/dispatch/settings.json`
- Project: `<repo-root>/.pi/dispatch/settings.json` (repo root = git top-level of cwd)

Resolution per tier field: **session override > project file > global file > built-in default.**

Built-in defaults (used only when nothing else is set):

```json
{
  "tiers": {
    "T1": { "model": "opencode-go/deepseek-v4-flash", "thinking": "high",  "tools": "read, grep, find, ls" },
    "T2": { "model": "inherit", "thinking": "high" },
    "T3": { "model": "openai-codex/gpt-5.6-sol", "thinking": "high" }
  }
}
```

`model: "inherit"` means use the parent session's active model. Settings files use the
same shape as above. Hand-editing them is fine; `reset` only deletes the project file.

## Settings flow (for `settings` command)

1. Read both settings files (if present) to show current effective values.
2. Read `~/.pi/agent/models-store.json` and build the model list: one entry per model as
   `provider/model-id` with its display name. If the file is missing or unparseable,
   skip the picker and ask for model ids as free text instead.
3. Open ONE `ask_user` form with:
   - One choice question per tier (T1, T2, T3): model options from the list, current
     effective value marked as recommendation, plus an "inherit" option for T2.
   - One choice question for scope: `global` or `project`.
4. Merge answers into the chosen file: update only the tiers the user changed, preserve
   other fields. Create parent directories as needed. Never write credentials or
   anything beyond this schema.
5. Confirm in one line and show the new effective table.

## Routing rubric (task type + blast radius)

Classify each delegated subtask BEFORE launch:

- **T1** — Read-only: lookups, greps, single-file reads, fanout research collection,
  summarization of known sources.
- **T2** — Focused single-file or small-scope edits, straightforward bug fixes,
  test writing, standard reviews.
- **T3** — Multi-file refactors, architecture/design work, security, migrations,
  performance work, safety-critical paths, or any task where requirements are ambiguous.

When torn between two tiers, route UP. When the parent itself will synthesize/apply
child output, children doing collection/analysis can drop one tier below what they'd
need as a sole writer.

## Dispatching

When mode is on (auto) or manual:

1. Resolve each tier's config (resolution order above).
2. Prefer the tier agent for the classified tier (see Bootstrap). For a launch into any
   other existing agent, pass per-launch `model:` and optionally `thinking:` overrides
   from the tier config instead.
3. In manual mode, state proposed tier + model and wait for confirmation before launch.
4. State the choice in one line per launch, e.g. `T1 -> dispatch-scout (opencode-go/deepseek-v4-flash): find auth middleware files`.
5. A one-shot tier (set via `T<n> <task>`) wins over the rubric for the next launch only.

Skill text and workflowScript conventions come from the `pi-subagents` skill; this skill
changes only model/agent selection, not orchestration structure, safety constraints, or
the one-writer-per-worktree rule.

## Bootstrap (first `on`)

1. `subagent({ action: "list" })`. If agents `dispatch-scout`, `dispatch-worker`,
   `dispatch-architect` already exist, skip creation.
2. Otherwise create them via `subagent({ action: "create", config: {...} })` using the
   resolved tier config:
   - `dispatch-scout` (T1): tools from tier config (default read-only), short system
     prompt: fast, precise, read-only investigator; report findings, make no edits.
   - `dispatch-worker` (T2): standard implementation tools, prompt: focused implementer;
     smallest correct diff; follow repo conventions.
   - `dispatch-architect` (T3): thinking high, full tools, prompt: senior problem-solver
     for complex/ambiguous/safety-critical work; analyze fully before editing.
3. If tier models later change via settings/set, existing agent files keep their old
   model — per-launch `model:` override applies the new value, so no re-bootstrap needed.
