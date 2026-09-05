---
name: kaneo-tracker
description: Creates, updates, and tracks Kaneo tasks through an available Kaneo MCP integration. Use to turn approved implementation plans into tracked work, organize a backlog, report progress and blockers, reconcile plan changes, or identify the next ready task. Companion to the plan skill; also supports standalone task management.
compatibility: Requires an authenticated Kaneo integration exposing task and project operations. Plan-linked workflows require access to the relevant approved plan.
metadata:
  author: gurbakhshish
  spec: https://agentskills.io/specification
---

# Kaneo Tracker

Keep approved scope in the plan and live execution progress in Kaneo.
Manage work; do not implement code merely because a task is ready.

## Ownership and boundaries

- Use the plan skill for repository-grounded implementation planning.
  Preserve its intake, approval, and completion gates rather than
  duplicating or bypassing them.
- Use this skill for backlog organization, task creation, priorities,
  dependencies, progress updates, and reporting.
- Support standalone tasks without requiring a plan.
- Do not edit plan files, checkboxes, or phase statuses as part of tracking.
- Do not silently change approved scope to match board activity.
- Never mark a plan phase complete before the user explicitly confirms it.
  Passing verification alone is not phase approval.

## Resolve context

1. Identify the requested operation: capture, organize, import, update,
   report, reconcile, or choose next work.
2. Inspect the supplied plan or task references before asking questions.
   If plan approval is unclear, confirm it before importing.
3. Resolve the target workspace and project from explicit references or
   confirmed session context. Ask when the target is ambiguous.
4. Inspect the available integration's tool schemas. Discover project
   columns and use their actual status slugs; do not assume default names.
5. Resolve assignees from workspace members. Do not invent IDs, deadlines,
   priorities, estimates, URLs, or server capabilities.

Use available native Kaneo tools or the MCP gateway. Tool names can differ
between clients; discover operations rather than assuming a fixed prefix.
Do not retrieve credentials or read local authentication files.

Scope reads to the relevant workspace, project, and tasks. Follow pagination
when looking for existing work; a truncated list is not proof of absence.

If the integration or a required capability is unavailable, report the
limitation. Do not silently switch to direct HTTP or claim changes succeeded.

## Approvals

- Read and report without additional confirmation.
- Apply clear, explicitly requested individual task changes directly.
- Preview plan imports, bulk creation, and restructuring before writing.
  Show the target project, task mapping, dependencies, and proposed changes.
- An approved batch authorizes that batch, not unrelated follow-up work.
- During an explicitly requested tracking session, record observed starts,
  blockers, and verification results within the agreed scope.
- Ask before deleting tasks, moving work between projects, changing
  approved scope, or resolving conflicting information.
- Obtain explicit user confirmation before completing a plan phase.
- Do not create workspaces, projects, columns, or labels unless requested
  and supported by the available integration.

## Import an approved plan

1. Read the plan's objectives, phases, implementation tasks, dependencies,
   verification, risks, and completion gates.
2. Find existing linked tasks before proposing new ones.
3. Map a simple plan to one task and a phased plan to one task per phase.
   Keep implementation steps as a checklist in each task.
4. Propose subtasks only when a step needs independent ownership, blocking,
   or verification. Do not create a plan-parent task by default.
5. Translate genuine prerequisites into blocking relations. Do not turn
   every numbered phase into a dependency or introduce dependency cycles.
6. Preview and obtain approval, then create or update the mapped tasks.
7. Record returned task IDs and verify the resulting tasks and relations.

For each task, include the applicable sections:

- Objective and approved scope.
- Plan reference: repository identity, plan path, phase heading, and
  revision when available. Use a remote link only when known.
- Implementation checklist, preserving the plan's level of detail.
- Prerequisites and dependencies.
- Verification steps and expected results.
- Completion gate.
- Relevant risks or constraints.

Preserve deterministic instructions from Workhorse plans and bounded local
choices from Smart plans. Do not flatten away details required to execute.

Use an existing not-started column for imports. Resolve unclear status
mappings with the user. Leave unspecified assignees and dates unset; use
the integration's neutral priority when available.

Do not upload secrets, credentials, or unrelated private repository content.

## Avoid duplicates and preserve edits

Use existing task IDs first. Otherwise match the stored repository, plan
path, and phase reference; treat titles as supporting evidence only.

- Repeated imports should reuse matching tasks.
- Ask when multiple tasks match or a renamed phase has uncertain identity.
- Fetch the current task before editing.
- Change only intended fields and preserve human notes, checklist progress,
  assignments, and unrelated description content.
- Use narrow update operations when available. Read-merge-write operations
  may still race; do not claim atomic conflict protection.
- After a timeout or uncertain create result, look for the created task
  before retrying. Never blindly repeat creates or comments.

## Track execution

Record only progress supported by inspected evidence or explicit user reports.
Distinguish reported outcomes from checks performed by the agent.

- Move a task to the mapped active column when work actually starts.
- Check off an implementation step only when its completion is supported.
- Record blockers with their cause, affected work, and unblock condition.
  Use an existing blocked column if appropriate; otherwise record a note.
- Add concise comments for meaningful decisions, blockers, handoffs, and
  verification results. Avoid repetitive status-only comments.
- Include commands and outcomes when known. Never imply tests ran when
  they did not, and do not run implementation or tests solely to track work.
- When verification passes, report “awaiting user confirmation” unless
  phase completion has already been explicitly approved.
- Move a phase to the mapped completed column only after its required
  verification and user completion gate are satisfied.
- Mark skipped or superseded work explicitly; never present it as done.

Standalone tasks follow their stated acceptance criteria and the user's
requested status changes; do not impose a plan-phase gate on unrelated work.

## Organize work and reconcile changes

For standalone work, capture the outcome, scope, acceptance criteria, and
known dependencies. Ask only for missing information that changes the task.

Recommend priorities and ordering from explicit urgency, dependencies, risk,
and readiness. Label recommendations as proposals, not existing commitments.
Do not assign people or invent due dates to make the board look complete.

If technical implementation planning is needed, hand off to the plan skill.
Backlog organization does not authorize code changes.

When a plan changes:

1. Compare the current approved plan with its linked Kaneo tasks.
2. Report added, changed, removed, and ambiguously matched work.
3. Separate scope drift from ordinary progress updates.
4. Preview the reconciliation batch and obtain approval.
5. Preserve completed work and human edits. Do not automatically delete
   tasks for removed phases; propose a superseded disposition.
6. Keep unapproved plan changes out of the tracked execution scope.

If the user asks to change scope, resolve the plan revision through the plan
workflow before synchronizing it to Kaneo.

## Report and resume

For progress reports, show:

- Relevant task IDs and verified links when available.
- Completed, active, blocked, and not-started work.
- Verification or user approval still outstanding.
- Plan drift and incomplete synchronization.
- The next ready task and why its prerequisites are satisfied.

Count phases or tasks explicitly. Do not equate checklist counts with effort
or invent percentage-complete estimates.

After mutations, report what actually succeeded. If a batch partially fails,
list successful and unresolved operations and retain their task IDs.
Do not attempt destructive rollback. Re-read current state before resuming.

Keep responses concise. A report-only request must not mutate the board.
