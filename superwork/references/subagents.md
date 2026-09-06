# Subagent Fan-out Playbook

Read this only when a subagent capability is available. It maps the loop onto
subagent roles without changing the phase contract in `loop.md`.

## Detection

If no delegation tool exists, start solo sequential execution and say so once.
If a tool exists, inspect its capabilities before launching anything. On Pi,
call `subagent({ action: "list", capabilities: true })` and use only executable,
non-disabled roles. For external runners also require `runner.available === true`;
this passive lookup is not authentication or launch proof. Discovery failure,
missing required roles, or failed launches are blockers, not permission to switch
to solo or external execution. Do not launch a scout merely to test availability.

## Role mapping

| Loop step | Role | Mode | Agent Loadout default |
| --- | --- | --- | --- |
| Framing recon / phase research (codebase) | scout | read-only, fresh context | T1 |
| External research (docs, APIs, comparisons) | researcher | read-only | T2 |
| Build | worker (or the root) | the single writer | T2 for worker only |
| Verify: fresh review | reviewer | read-only, fresh context | T3 |
| Stuck on a judgment call | oracle / advisor | consult, one-shot | T3 |

## Agent Loadout integration

Agent Loadout is optional: it configures persistent role defaults; Superwork
controls execution. Its three tiers also include `delegate` in T1. Individual
roles can differ from their tier defaults. Do not infer a live model from a tier.

- Before the first delegation, inspect the native loaded mapping, on Pi with
  `subagent({ action: "models" })` or `/subagents-models`. Show the relevant
  role/model/thinking values and any available source/policy diagnostics. If
  native diagnostics are unavailable, state what is unverified; do not invent
  effective values by merging settings yourself.
- Omit per-run `model` overrides by default, including workflow-level overrides
  that would flatten every role onto one model. User-approved exceptions must
  name the affected role/phase, model/thinking, reason, and cost/provider impact.
  Do not rewrite persistent settings to implement a phase exception.
- Settings on disk may differ until reload. Resolve unexpected mapping drift
  before relying on a saved loadout; use Agent Loadout doctor when available.
  Preserve model-scope restrictions and thinking ceilings.
- If the root builds, say so explicitly: the root model is not managed by Agent
  Loadout and does not inherit the worker tier. Do not automatically switch it.
- Record executor, actual model/thinking from native run evidence, and run ID
  alongside phase verification. Distinguish requested from observed settings,
  including configured fallback attempts. Mark absent model evidence unverified
  rather than treating a child's self-description as proof.
- Do not add automatic model escalation, live probes, profile switching, or
  fallback chains. Existing runtime policy remains authoritative.

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

- Inadequate task output or a failed code check: use the phase's single fix
  iteration, then escalate. Do not silently replace a failed child with root
  implementation or count multiple independent retry allowances.
- Workflow, launch, prompt-runtime, extension, and child-tooling setup failures
  are infrastructure blockers. Stop and report the exact failure, run ID/status,
  repo/cwd/worktree, branch/ref, and clean state or captured partial diff. Verify
  no writer remains active before another mutation attempt. Retry only through
  a clear same-protocol recovery; switching to root, foreground, CLI, or another
  runner requires explicit owner approval. A generic `pi -ne` hint is not approval.
- Conflicting reviewer findings: the root synthesizes; if a real judgment call
  remains, escalate to the user.

## Pi-specific notes

Read the installed pi-subagents skill for current launch and control contracts.
For composed multi-step or parallel work, use one root-launched `workflowScript`
with `async: true`; launch children only inside it with stable keys. Do not treat
each phase/wave as permission to open another top-level workflow. The script
coordinates bounded assignments; the root retains phase decisions, supervision,
and the plan ledger. Keep mutation serial and observe every child result.

Follow native completion notifications rather than blocking merely to wait.
Permission-sensitive host gates require an authorized named workflow resource;
raw scripts cannot assume access to `runs.host`. External runners retain their
own option contract; do not pass native model/context/tool/acceptance options
unless supported. Never pass tight tool or turn budgets to mutation workers.
