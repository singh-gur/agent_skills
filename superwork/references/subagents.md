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
| Build | worker (or the root) | the single writer |
| Verify: fresh review | reviewer | read-only, fresh context |
| Stuck on a judgment call | oracle / advisor | consult, one-shot |

## Root-session coordination

The root session is the main orchestrator and the visible source of truth.

- The root frames phases, chooses child lanes, launches every delegation,
  consumes and synthesizes results, runs phase gates, updates the plan ledger,
  and decides whether a phase advances.
- Never give a child the whole Superwork workflow, the full multi-phase plan
  as an execution assignment, or responsibility for coordinating other
  children.
- Give each child one bounded phase step or independent lane with an explicit
  deliverable. Children return evidence and recommendations; they do not
  decide scope, contact the user, or mark phases done.
- Before each child wave, report in the main session:
  `Phase <n>/<total> — <step>: delegating <bounded purpose>`.
- After consuming each wave, report:
  `Phase <n>/<total> — <step>: <outcome>; next: <action>`.
- Do not rely on child transcripts, background status, or live cards as the
  only progress signal. The root summarizes meaningful progress in the main
  session.
- Ordinary children do not spawn their own children.

## Concurrency

- **Parallel is safe**: read-only research fan-out (scout + researcher on
  independent questions) and review fan-out (reviewers on distinct concerns).
- **Serial only**: all mutation. One writer at a time, and never while a
  reviewer is reading the same files.
- Compare child prompts before launch: each child gets a lane-specific task,
  the exact files or questions, and the decision it informs. No clone prompts.

## Task text for each role

- **scout**: name the phase, list the files/paths to trace, what the root needs
  back (interfaces, patterns, risks), and the size limit of the answer.
- **researcher**: the focused question, what was already ruled out, and the
  required output (recommendation + citations, not a survey).
- **worker**: the phase contract (goal, expected files, done criteria, verify
  commands), the repo state to start from, and the rule to stop and report if
  the contract cannot be met.
- **reviewer**: the diff (or commit range), the phase goal and done criteria,
  and the ask: blocking findings vs. notes. Explicitly read-only.

## Failure handling

- A child that fails or returns junk: retry once with a sharpened task; then
  do the work in the root. Do not loop dispatches.
- Conflicting reviewer findings: the root synthesizes; if a real judgment call
  remains, escalate to the user.

## Pi-specific notes

On Pi with pi-subagents, prefer root-launched `workflowScript` calls for
composed read-only waves, with stable keys. Keep mutation lanes serial. A
workflow script coordinates only its bounded wave; it does not replace the
root as the Superwork orchestrator. Never pass tight tool or turn budgets to
workers that mutate files.
