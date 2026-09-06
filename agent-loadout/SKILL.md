---
name: agent-loadout
description: Configures persistent pi-subagents model and thinking overrides using three capability tiers or individual roles. Use when the user explicitly invokes agent-loadout set, unset, status, or doctor for scout, delegate, researcher, worker, reviewer, or oracle at user or project scope.
compatibility: Requires npm-installed Pi, pi-subagents, Node.js, and permission to update Pi settings. Helper integration checked against Pi 0.85.1 and pi-subagents 0.65.1; compatible versions must expose the same APIs.
metadata:
  author: gurbakhshish
  source: custom
  spec: https://agentskills.io/specification
---

# Agent Loadout

Configure persistent model/thinking defaults. Superwork owns execution and role
selection; this skill never routes individual tasks or changes the root model.

## Three tiers

| Tier | Intended use | Agents | Preferred thinking |
|---|---|---|---|
| T1 | Fast reconnaissance and lightweight delegation | `scout`, `delegate` | `low` |
| T2 | Substantive research and implementation | `researcher`, `worker` | `high` |
| T3 | Strong review and advisory reasoning | `reviewer`, `oracle` | `xhigh` |

Tiers are setup defaults, not mandatory coupling. Allow targeted role changes.
Thinking values are recommendations: offer only the selected model's supported
levels and use Pi's clamped recommendation. `advisor` resolves to `oracle`;
never create an `advisor` override.

Existing settings store role names, not tier numbers. Do not migrate or rewrite
saved overrides automatically. T4 and old four-tier helper flags are unsupported.

## Commands

Parse arguments after `/skill:agent-loadout`:

| Command | Action |
|---|---|
| `set [user\|project] [all\|T1\|T2\|T3\|agent]` | Configure selected tiers or role; omitted target means all. |
| `unset [user\|project] [all\|T1\|T2\|T3\|agent]` | Remove only selected model/thinking overrides. |
| `status [user\|project\|all]` | Show saved overrides, not effective runtime behavior. |
| `doctor [user\|project\|all]` | Compare saved overrides with native runtime diagnostics. |
| no argument | Same as `status all`. |

Ask for scope only when omitted for set/unset. Status/doctor default to all.
Reject unknown arguments. Do not support on/off, automatic escalation, or presets.

## Scope and precedence

Resolve and show the exact settings path before any write:

- User: `$PI_CODING_AGENT_DIR/settings.json`, otherwise `~/.pi/agent/settings.json`.
- Project: the trusted Pi project root's `.pi/settings.json`.

Prefer the native runtime's reported project root. Otherwise find the nearest
ancestor with `.pi` or `.agents` and honor `subagents.projectRootResolution`:
a nearer explicit `nearest` wins; `git-root` selects the configured Git worktree
root when present. Outside configured projects, propose `<git-root>/.pi/settings.json`
or `<cwd>/.pi/settings.json` and obtain confirmation before creating it. Do not
inspect unrelated settings or sensitive values to resolve scope.

Matching `agentOverrides` replace model/thinking frontmatter, including on custom
agents shadowing builtins. Provider-scoped overrides can supersede ordinary
overrides within a scope; project settings take precedence over user settings.
Per-run model choices (including thinking suffixes) can supersede loaded defaults.
Use native runtime inspection rather than implementing another precedence merger.
Model-scope restrictions and thinking ceilings still apply.

## Helpers

Resolve scripts relative to this skill:

- `scripts/model-options.mjs`: exact-first/fuzzy catalog search and batched,
  model-specific thinking choices using Pi's ModelRuntime and thinking helpers.
- `scripts/agent-overrides.mjs`: validated saved status, targeted previews and
  revision-checked writes. Modifies only mapped roles' `model` and `thinking`.

The standalone catalog does not load the current session's provider extensions.
Catalog membership is not authentication, policy, or successful-launch proof.
For missing extension-provided models, run doctor and report this limitation;
do not invent a match, load arbitrary extensions, or read credentials. Stop a
set operation if supported model/thinking metadata cannot be verified.

Use `PI_PACKAGE_DIR` only to identify a trusted npm-installed Pi package if PATH
uses a wrapper or another installation. Invalid paths fail rather than silently
selecting another Pi. The settings writer reuses Pi's installed `proper-lockfile`;
no additional dependency is needed.

## Set workflow

1. Resolve scope/target and run saved status:

   ```bash
   node <skill-root>/scripts/agent-overrides.mjs status --file "<settings-path>"
   ```

2. Ask only for the selected tiers/role, in one form. Recommend a current model
   only when selected roles agree. Explicitly allow blank input to keep existing
   overrides unchanged, including intentional differences within a tier. If all
   inputs are blank, stop without writing. For a thinking-only change, keep the
   current model and validate it normally; do not make the user rediscover it.
3. Batch the non-blank model queries in one runtime (at most six requests):

   ```bash
   node <skill-root>/scripts/model-options.mjs batch --requests \
     '[{"query":"<model text>","preferredThinking":"high"}]'
   ```

   Single-query `search --query "<model text>" --preferred-thinking high` also
   works. Require model text without a thinking suffix. Use the unique exact
   match; otherwise auto-select only when `totalMatches` is one. When ambiguous,
   ask the user to choose. If `truncated` is true, offer query refinement instead
   of implying the displayed matches are exhaustive. No matches: refine the query
   or diagnose a catalog limitation. Store canonical `provider/model` only.
4. Ask for supported thinking choices in one form. Use each result's
   `thinkingLevels` and `preferredThinking`; select a sole supported level without
   another question. Preserve a currently consistent thinking choice if supported.
5. Build policies keyed by the selected tier or canonical role. Omit unchanged
   groups. Do not combine overlapping targets (for example, T3 and reviewer).
   Preview the exact diff:

   ```bash
   node <skill-root>/scripts/agent-overrides.mjs set --file "<settings-path>" \
     --policies '{"reviewer":{"model":"provider/model","thinking":"high"}}' --dry-run
   ```

6. Show the path and before/after model/thinking values. Explain which existing
   fields are replaced and whether the change is user-wide. No changes: stop.
   Retain the preview's `Revision` and require explicit confirmation.
7. Revalidate all selected canonical models in one batch, deduplicating identical
   model queries. For each assignment, require an exact canonical match and the
   chosen level in `thinkingLevels`. Stop without writing on any failure.
8. Apply the same policies with the approved revision:

   ```bash
   node <skill-root>/scripts/agent-overrides.mjs set --file "<settings-path>" \
     --policies '{"reviewer":{"model":"provider/model","thinking":"high"}}' \
     --expect "<approved-preview-revision>"
   ```

   If settings changed, preview again and obtain fresh approval. Never silently
   replace the expected revision. On lock contention, wait for the other writer
   to finish; do not delete its lock or switch to an unguarded writer.
9. Show the result. Require reload/restart and recommend doctor before relying
   on the new mapping; do not claim that saving settings updates a live session.

## Unset workflow

Resolve scope/target, then preview:

```bash
node <skill-root>/scripts/agent-overrides.mjs unset --file "<settings-path>" \
  --target reviewer --dry-run
```

Use all, T1, T2, T3, or a mapped role as the target. Explain that unset removes
only model/thinking, including overrides predating this skill. It is **not undo**:
it does not restore previous values, and other scopes/provider overrides may
still configure the role. Preserve other fields; remove only emptied role and
agentOverrides objects. If nothing changes, stop without creating files.

Obtain explicit approval, then repeat the command without `--dry-run`, adding
`--expect "<approved-preview-revision>"`. On a revision conflict, preview and
confirm again. Report the result and the reload/restart requirement.

## Status and doctor

Run the settings helper's status command once per selected settings file. Report
missing files, unset/cleared fields, invalid structure, and mixed tier overrides.
Mixed values may be intentional after targeted edits. Do not treat invalid
settings as unset. Show only loadout-relevant values, never raw settings.

Doctor also uses native read-only inspection, not test launches:

1. Call `subagent({ action: "list", capabilities: true })` to identify available
   roles, shadowing, disabled/missing roles, and runner types. A runner's passive
   availability is not authentication or launch proof.
2. Call `subagent({ action: "models" })` for loaded mappings, or direct the user
   to `/subagents-models` if native inspection is unavailable. Filter the report
   to mapped roles. Never fall back to dumping settings or auth files.
3. Show saved vs loaded model/thinking and native source information when
   available. Explain project/provider overrides, per-run exceptions, and stale
   sessions rather than assuming every difference is a bug. Do not infer a
   source or effective value when native diagnostics do not expose it.
4. Report available model-scope/thinking-ceiling diagnostics without modifying
   policy. Mark unavailable diagnostics as unchecked. Catalog-known, loaded,
   policy-checked, and launch-verified are separate claims; no probe means launch
   readiness is unverified. Paid or live probes require separate explicit approval
   and must follow the current subagent protocol.

## Safety and Superwork contract

- Never modify agent files, root/default models, tools, prompts, skills, disabled
  flags, policy, fallback chains, provider overrides, or unrelated settings.
- Never use subagent update/reset/profile loading as a substitute writer. Native
  profile loading can replace the whole override map; this skill owns only the
  selected model/thinking fields.
- Never display credentials or raw JSON parse errors containing settings snippets.
- Reject settings-file symlinks, including dangling links. Explain the refusal;
  never resolve and modify the target without a separately approved workflow.
- Preview is read-only. Writes use Pi-compatible locking, revision checks,
  private temporary files, and atomic replacement. Non-cooperating writers can
  still race the final check; avoid concurrent manual/settings edits. No-op
  updates preserve file contents and do not create missing settings files.
- Superwork should consume the loaded role defaults without passing model
  overrides unless the user approves an exception. Root implementation is outside
  this loadout. Record actual executor/model/thinking evidence, not assumed tiers.
