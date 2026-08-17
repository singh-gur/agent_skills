---
name: agent-loadout
description: Configures persistent pi-subagents model and thinking overrides using four capability tiers. Use when the user explicitly invokes agent-loadout set, unset, or status to configure the builtin scout, researcher, reviewer, delegate, worker, and oracle agents at user or project scope.
compatibility: Requires an npm-installed Pi, pi-subagents, Node.js, and permission to update Pi user or project settings.
metadata:
  author: gurbakhshish
  source: custom
  spec: https://agentskills.io/specification
---

# Agent Loadout

Configure persistent `pi-subagents` model and thinking overrides by assigning its builtin agents to four capability tiers.

This skill changes Pi settings. It does not classify individual tasks, alter subagent launches, or provide runtime ON/OFF routing.

## Agent tiers

Use this fixed mapping:

| Tier | Intended use | Agents | Preferred thinking |
|---|---|---|---|
| T1 | Fast reconnaissance and research | `scout`, `researcher` | `low` |
| T2 | Review and lightweight delegation | `reviewer`, `delegate` | `medium` |
| T3 | Standard implementation | `worker` | `high` |
| T4 | Difficult advisory reasoning | `oracle` | `xhigh` |

Preferred thinking values are recommendations only. Obtain valid choices from the selected model rather than assuming every model supports them.

`advisor` is an alias for `oracle`; do not create a separate override for it.

Overrides follow normal `pi-subagents` precedence. An agent definition that explicitly declares `model` or `thinking` can take precedence over `agentOverrides`.

## Commands

Parse the argument after `/skill:agent-loadout`:

| Command | Action |
|---|---|
| `set [user\|project]` | Ask for tier models, resolve them against Pi's known model catalog, ask for supported thinking levels, then set agent overrides. |
| `unset [user\|project]` | Remove model and thinking overrides for the mapped agents. |
| `status [user\|project\|all]` | Show only the mapped agents' configured overrides. |
| no argument | Same as `status all`. |

Do not support the previous `on`, `off`, `manual`, one-shot tier, or per-launch routing commands.

## Settings paths

Resolve the target settings file before changing anything:

- User scope: `$PI_CODING_AGENT_DIR/settings.json` when `PI_CODING_AGENT_DIR` is set; otherwise `~/.pi/agent/settings.json`.
- Project scope: the current Pi project root's `.pi/settings.json`.

For project scope:

1. Find the nearest ancestor containing `.pi` or `.agents`.
2. Honor an existing `subagents.projectRootResolution` value of `nearest` or `git-root`.
3. If no configured project root exists, propose `<git-root>/.pi/settings.json`, or `<cwd>/.pi/settings.json` outside Git, and require confirmation before creating it.

Only use project scope for a project the user trusts.

## Helper scripts

Resolve both scripts relative to this `SKILL.md`:

- `scripts/model-options.mjs` searches Pi's composed model catalog and reports model-specific thinking levels.
- `scripts/agent-overrides.mjs` reads or changes the selected settings file.

The model helper uses Pi's own `ModelRuntime`, fuzzy matcher, `getSupportedThinkingLevels()`, and `clampThinkingLevel()`. It does not display credentials.

The settings helper accepts an explicit settings path and modifies only:

```text
subagents.agentOverrides.<mapped-agent>.model
subagents.agentOverrides.<mapped-agent>.thinking
```

It never prints unrelated settings.

## Set workflow

For `set`:

1. Resolve the requested scope. If omitted, ask whether to use `user` or `project`.
2. Run the settings helper's `status` command for that settings file.
3. Open one `ask_user` form containing one text question for each tier's model.
4. Recommend a currently consistent tier model when every mapped agent in that tier has the same override.
5. Ask for a model name, ID, or `provider/model` reference without an appended thinking suffix.
6. For each tier, run:

```bash
node <skill-root>/scripts/model-options.mjs search \
  --query <user-model-text> \
  --preferred-thinking <tier-preference>
```

Run independent tier searches in parallel when possible.

7. Resolve each search result:
   - If there are no matches, ask for a different query.
   - If exactly one result is marked `exact`, use it.
   - If there is only one result, use it.
   - Otherwise, ask the user to choose from the ranked matches.
   - Store the canonical `provider/model` value, never the original fuzzy query.
8. Ask for each tier's thinking level using only the selected result's `thinkingLevels`.
   - If only one level is supported, select it without asking.
   - Recommend the result's `preferredThinking`.
   - Never offer or store a thinking level absent from `thinkingLevels`.
9. Show the exact settings path and resulting mapping.
10. Warn when existing model or thinking fields will be replaced.
11. Require explicit confirmation.
12. Re-run the model helper once per selected canonical model. Stop without writing if:
    - the canonical model is no longer an exact known match; or
    - the chosen thinking level is no longer listed in `thinkingLevels`.
13. Run:

```bash
node <skill-root>/scripts/agent-overrides.mjs set \
  --file <settings-path> \
  --t1-model <canonical-model> --t1-thinking <validated-level> \
  --t2-model <canonical-model> --t2-thinking <validated-level> \
  --t3-model <canonical-model> --t3-thinking <validated-level> \
  --t4-model <canonical-model> --t4-thinking <validated-level>
```

14. Show the settings helper's summary and tell the user to reload or restart Pi before relying on the new mapping.

The settings helper retains its general Pi thinking-level syntax check as a final guard. Model-specific availability comes exclusively from the model helper.

## Unset workflow

For `unset`:

1. Resolve the requested scope. If omitted, ask whether to use `user` or `project`.
2. Run the settings helper's `status` command.
3. Explain that unset removes only `model` and `thinking` from:
   - `scout`
   - `researcher`
   - `reviewer`
   - `delegate`
   - `worker`
   - `oracle`
4. Warn that this also removes matching overrides that may predate this skill.
5. Require explicit confirmation.
6. Run:

```bash
node <skill-root>/scripts/agent-overrides.mjs unset \
  --file <settings-path>
```

7. Show the settings helper's summary and tell the user to reload or restart Pi.

Preserve every other override field. Remove a mapped agent's override object only when it becomes empty.

## Status workflow

For `status`:

- `status user`: inspect only user settings.
- `status project`: inspect only project settings.
- `status all` or no argument: inspect both.
- Do not print unrelated settings values.
- Clearly distinguish missing files, unset fields, and conflicting values within a tier.
- Remind the user that the live runtime mapping may remain stale until Pi reloads.

Run once per selected settings file:

```bash
node <skill-root>/scripts/agent-overrides.mjs status \
  --file <settings-path>
```

## Safety rules

- Never modify agent definition files.
- Never use `subagent({ action: "update" })` for bundled agents; it requires an editable user/project agent file and is not an `agentOverrides` writer.
- Never change `subagents.defaultModel`, `subagents.defaultThinking`, agent tools, prompts, skills, disabled state, or unrelated settings.
- Never display unrelated settings or credentials.
- Stop without writing when model discovery fails, no requested model is known, a thinking level is unsupported, the settings file is malformed, or expected settings objects have incompatible types.
- Do not claim a configured override is live until Pi has reloaded.
- If a custom agent shadows a builtin and pins its own model or thinking in frontmatter, explain that the frontmatter can take precedence.
