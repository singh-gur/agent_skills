---
name: superwork
description: Executes complex multi-stage work through a verified research → build → verify loop. Off by default; use `/skill:superwork on`, `off`, or `status`, or invoke it with a task for one-shot execution. Use for phased plans, large features, refactors, migrations, and research-then-build work, not single-pass changes or plan-only requests.
compatibility: Designed for Pi skill commands and its disable-model-invocation extension. Enhanced when pi-subagents is installed; degrades to solo sequential execution.
metadata:
  author: gurbakhshish
  spec: https://agentskills.io/specification
disable-model-invocation: true
---

# Superwork

Execute complex work as a sequence of verified phases. The root session stays
the visible owner: it frames, dispatches, reports progress, verifies, and
decides. Helpers contribute bounded research, implementation, or review.

## Activation

Superwork is **OFF** at the start of every root session. Keep its state as an
in-conversation boolean owned by the root session; never persist it to a file
or inherit it in child sessions.

Interpret trimmed skill-command arguments as follows:

| Argument | Behavior |
| --- | --- |
| `on` | Enable Superwork for eligible complex execution requests in this root session. Acknowledge without starting work. |
| `off` | Disable future automatic use in this root session. Do not cancel work already in flight unless the user also asks to stop it. |
| `status` | Report whether Superwork is on or off and whether a one-shot run is active. |
| no argument | Report status and show the command forms. |
| any other non-empty argument | Treat it as a one-shot Superwork task. Run it without changing the prior on/off state. |

When Superwork is off, do not apply this workflow unless the user explicitly
invokes it with a task. When it is on, still use it only for work matching the
description; handle small changes and plan-only requests normally.

## Non-negotiables

- Never mark a phase done without its verification passing.
- The root session is the main orchestrator, coordinator, and user-visible
  control plane. Never delegate the complete Superwork workflow or a
  multi-phase plan to a child.
- One writer: at most one agent (the root, or one worker) mutates the repo at a
  time. Reviewers and researchers are read-only.
- The root owns phase transitions, plan-ledger updates, consequential
  decisions, and all user-facing progress reports.
- Record phase state after every phase boundary so an interrupted run can
  resume.
- Escalate consequential decisions (scope, architecture, safety, deletions,
  releases) to the user instead of deciding silently.
- Stop and re-plan when reality contradicts the plan; do not force a stale
  plan.

## Workflow

### 1. Frame

1. Locate a plan: `PLAN.md`, `plans/*.md`, `SPECS.md`, or one supplied by the
   user. Read it fully.
2. Validate it against the current repo — skim the key files it names. If the
   plan is stale (files moved, assumptions broken), re-frame the affected
   phases and confirm with the user before executing.
3. No plan found → run a compressed framing intake: goal, scope boundaries,
   constraints, done criteria, a repo scan, then break the work into 2–6
   phases that are each independently verifiable. Present the phase list and
   get user confirmation before touching code.
4. Result: a phase list where every phase has a **goal**, **expected files**,
   **done criteria**, and **verify commands**. Record it in the plan file (or
   create one) so the run is recoverable.

### 2. Per phase: research → build → verify

Read `references/loop.md` for the full phase contract before starting the
first phase. Summary:

- **Research** — gather just enough context to build the phase correctly:
  relevant code paths, APIs, external facts. Bounded, not exhaustive.
- **Build** — implement the phase. Smallest diff that satisfies the phase goal.
- **Verify** — run the phase's verify commands; they must pass. When subagents
  are available, also get a fresh-context review of the diff against the phase
  goal. On failure: one fix iteration, then escalate to the user with what
  failed and the options.
- **Record** — the root marks the phase status (done / blocked / re-framed) in
  the plan file, with one line of verification evidence.

The root reports each phase transition in the main session. Before a child
wave, state what is being delegated and why. After consuming its results,
state the outcome and next step. Do not make users inspect child transcripts
to understand overall progress.

### 3. Report

When all phases complete (or work stops): what changed and why, verification
evidence per phase, residual risks, and recommended next steps. Keep it tight.

## Subagents

If a subagent capability is available (for example, the pi-subagents
extension), read `references/subagents.md` and follow the fan-out playbook.
The root session makes every delegation call and sends only bounded,
phase-specific assignments. Children never own phase progression, the plan
ledger, user interaction, or further orchestration.

If no subagents exist, run the same loop solo and sequentially — nothing else
changes.

## Edge cases

- **Phase reveals the plan is wrong** → stop, re-frame remaining phases,
  confirm with the user, continue.
- **No build or tests exist for verification** → state explicitly how
  correctness was checked instead (reviewer pass, targeted script, manual
  trace) and let the user decide whether that suffices.
- **Interrupted run** → on resume, read the recorded phase state, re-verify the
  last claimed-done phase cheaply, and continue from there.
- **Phases with shared file overlap** → serialize them.
