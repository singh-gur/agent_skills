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
skill only changes which model each child launch uses.

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
| `on` | Enable auto-routing. Confirm in one line. |
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
    "T1": { "model": "opencode-go/deepseek-v4-flash", "thinking": "high" },
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

Determine the tier from the delegated task's complexity, scope, ambiguity, risk, required
judgment, and authority. Determine the agent separately from the task's purpose, such as
research, reconnaissance, implementation, review, or advisory work. The tier selects the
model capability; the agent selects the role. Do not infer a tier solely from an agent's
name, because the same agent may handle tasks at different tiers.

When torn between two tiers, route UP. When the parent itself will synthesize/apply
child output, children doing collection/analysis can drop one tier below what they'd
need as a sole writer.

## Dispatching

When mode is on (auto) or manual:

1. Classify the delegated task using the routing rubric.
2. Resolve the tier config using the resolution order above.
3. Inspect the currently available agents with `subagent({ action: "list" })` when the
   list is not already current.
4. Choose only an existing executable, non-disabled agent whose declared purpose,
   capabilities, tools, context behavior, and authority fit the task. Never assume fixed
   agent names, and never create or update an agent. If no suitable agent exists, do not
   create one; keep the work in the parent or report that delegation is unavailable.
5. Pass the tier's `model` and `thinking` as per-launch overrides. Preserve the selected
   agent's existing prompt, tools, and safety constraints.
6. In manual mode, state the proposed tier, agent, and model, then wait for confirmation.
7. State the choice in one line per launch, e.g.
   `T1 -> <existing-agent> (opencode-go/deepseek-v4-flash): find auth middleware files`.
8. A one-shot tier (set via `T<n> <task>`) wins over the rubric for the next launch only.

Skill text and workflowScript conventions come from the `pi-subagents` skill; this skill
changes only model selection, not orchestration structure, role selection rules, safety
constraints, or the one-writer-per-worktree rule.
