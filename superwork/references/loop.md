# Phase Loop Reference

Loaded by SKILL.md before the first phase. Defines the phase contract and the
verify gate in detail.

## Phase contract

Every phase must be written down (in the plan file) before work starts:

- **Goal**: one sentence, the user-visible outcome.
- **Expected files**: the files or areas the phase is allowed to touch. Found
  work outside this list is a signal to re-frame, not to silently expand.
- **Done criteria**: observable conditions ("X renders", "migration is
  reversible", "endpoint returns Y").
- **Verify commands**: the exact commands that prove the phase (build, test,
  lint, a script). If none exist, name the substitute evidence.

A phase that cannot state verify commands is not ready to start.

## Research step

Bounded context gathering:

- Trace the code paths the phase touches end to end — read, don't guess.
- Identify existing helpers, types, and patterns to reuse before writing new
  ones.
- External unknowns (APIs, library behavior): verify against current docs,
  not memory.
- Stop when you can state what to build and how it will be verified. Research
  is not the deliverable.

## Build step

- Smallest diff that satisfies the phase goal and done criteria.
- No speculative abstractions, no unrelated cleanup, no "while I'm here".
- If the build uncovers a problem belonging to a later phase, record it in the
  plan file as a note and continue; do not absorb it silently.

## Verify gate

A phase is done only when, in order:

1. **Commands pass** — every verify command exits successfully. If a verify
   command fails for environmental reasons (missing tool, sandbox), say so and
   agree with the user on a substitute; never mark pass on a skipped check.
2. **Fresh review passes** (subagents available) — a reviewer that has not
   worked on the phase checks the diff against goal + done criteria and
   reports blocking findings vs. notes. Blocking findings fail the gate.
3. **State recorded** — phase status plus one line of evidence.

### Failure handling

- First failure: one fix iteration (diagnose → fix → re-run the full gate).
- Second failure of the same gate: stop. Report the failure, the diagnosis,
  and 2–3 options. Escalate rather than thrash.

## Phase state ledger

Keep this at the bottom of the plan file, updated at every boundary:

```
## Progress
- [x] Phase 1 — goal… — verified: <command/result> 2024-01-01
- [ ] Phase 2 — in progress
- [ ] Phase 3
```

This ledger is the resume point for interrupted runs.
