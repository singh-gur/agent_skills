---
name: superwork
description: Executes complex multi-stage work through a per-phase research → build → verify loop — implementing phased plans, large features, refactors, migrations, or research-then-build tasks. Accepts an existing plan (PLAN.md, plans/*.md, SPECS.md) or frames one through compressed intake, verifies each phase before moving on, and fans out to subagents (scout, researcher, worker, reviewer) when available, degrading to a solo sequential loop otherwise. Not for single-pass small changes or plan-only requests.
compatibility: Works on any Agent Skills client. Enhanced when the pi-subagents extension is installed; capability is detected at runtime and degrades gracefully.
metadata:
  author: gurbakhshish
  spec: https://agentskills.io/specification
---

# Superwork

Execute complex work as a sequence of verified phases. You (the parent agent)
stay the single owner: you frame, dispatch, verify, and decide. Helpers —
subagents when available — contribute context, implementation, and review.

## Non-negotiables

- Never mark a phase done without its verification passing.
- One writer: at most one agent (you, or a single worker) mutates the repo at a
  time. Reviewers and researchers are read-only.
- Record phase state after every phase boundary so an interrupted run can resume.
- Escalate consequential decisions (scope, architecture, safety, deletions,
  releases) to the user instead of deciding silently.
- Stop and re-plan when reality contradicts the plan; do not force a stale plan.

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
- **Record** — mark the phase status (done / blocked / re-framed) in the plan
  file, with one line of verification evidence.

### 3. Report

When all phases complete (or work stops): what changed and why, verification
evidence per phase, residual risks, and recommended next steps. Keep it tight.

## Subagents

If a subagent capability is available (for example, the pi-subagents
extension), read `references/subagents.md` and follow the fan-out playbook:
scout for recon, researcher for external research, worker for isolated builds,
reviewer for fresh verification. If no subagents exist, run the same loop solo
and sequentially — nothing else changes.

## Edge cases

- **Phase reveals the plan is wrong** → stop, re-frame remaining phases,
  confirm with the user, continue.
- **No build or tests exist for verification** → state explicitly how
  correctness was checked instead (reviewer pass, targeted script, manual
  trace) and let the user decide whether that suffices.
- **Interrupted run** → on resume, read the recorded phase state, re-verify the
  last claimed-done phase cheaply, and continue from there.
- **Phases with shared file overlap** → serialize them; only disjoint phases
  may run concurrently.
