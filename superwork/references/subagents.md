# Subagent Fan-out Playbook

Read this only when a subagent capability is available. It maps the loop onto
subagent roles without changing the phase contract in `loop.md`.

## Detection

A subagent capability is available if a subagent/agent-delegation tool is
present (for example, the pi-subagents extension with the `subagent` tool).
When in doubt, attempt a cheap read-only delegation (scout); if delegation is
unavailable, fall back to solo sequential execution and say so once.

## Role mapping

| Loop step | Role | Mode |
| --- | --- | --- |
| Framing recon / phase research (codebase) | scout | read-only, fresh context |
| External research (docs, APIs, comparisons) | researcher | read-only |
| Build | worker (or the parent) | the single writer |
| Verify: fresh review | reviewer | read-only, fresh context |
| Stuck on a judgment call | oracle / advisor | consult, one-shot |

Parent rules:

- The parent frames phases, dispatches, synthesizes results, and decides.
- Children return findings; they do not decide scope or mark phases done.
- Ordinary children do not spawn their own children.

## Concurrency

- **Parallel is safe**: research fan-out (scout + researcher on independent
  questions), review fan-out (multiple reviewers on distinct concerns).
- **Serial only**: any mutation. One worker at a time, and never while a
  reviewer is reading the same files. If phases touch disjoint files, their
  builds may overlap in isolated worktrees when the platform supports them;
  otherwise serialize.
- Compare child prompts before launch: each child gets a lane-specific task,
  the exact files or questions, and the decision it informs. No clone prompts.

## Task text for each role

- **scout**: name the phase, list the files/paths to trace, what the parent
  needs back (interfaces, patterns, risks) and the size limit of the answer.
- **researcher**: the focused question, what was already ruled out, and the
  required output (recommendation + citations, not a survey).
- **worker**: the phase contract (goal, expected files, done criteria, verify
  commands), the repo state to start from, and the rule to stop and report if
  the contract cannot be met.
- **reviewer**: the diff (or commit range), the phase goal and done criteria,
  and the ask: blocking findings vs. notes. Explicitly read-only.

## Failure handling

- A child that fails or returns junk: retry once with a sharpened task; then
  do the work in the parent. Do not loop dispatches.
- Conflicting reviewer findings: parent synthesizes; if a real judgment call
  remains, escalate to the user.

## Pi-specific notes

On pi with pi-subagents, prefer `workflowScript` for composed waves (research
fan-out, parallel reviews) with stable keys, and keep mutation lanes serial.
Never pass tight tool/turn budgets to workers that mutate files. Keep the
parent as orchestrator; do not let children fan out further.
