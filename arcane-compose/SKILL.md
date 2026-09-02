---
name: arcane-compose
description: Scaffolds Docker Compose apps for Arcane GitOps sync (getarcane.app). Use when the user describes an app idea ("set up paperless", "a wiki with postgres", "n8n automation stack") and wants it fleshed out into a compose.yaml + .env committed to a gitops repo that Arcane syncs and deploys. Also use for editing or troubleshooting existing Arcane-managed compose apps.
compatibility: Needs a git repo for gitops output; docker compose CLI for optional validation.
metadata:
  author: gurbakhshish
  docs: https://getarcane.app/docs
---

# Arcane Compose

Turn an app idea into an Arcane GitOps-synced Compose project.

## Layout

One gitops monorepo, one subdir per app:

```
<gitops-repo>/
  apps/
    <app-name>/
      compose.yaml     # exactly one compose file — Arcane stops on ambiguity
      .env             # committed, non-secret defaults + CHANGE_ME placeholders
      .env.example     # every var documented
```

## Workflow

### 1. Resolve the gitops repo

1. If `ARCANE_GITOPS_REPO` is set, use it.
2. Else if the cwd is inside a git repo containing `apps/`, use that repo root.
3. Else ask the user for the repo path once and proceed. Create `apps/` if missing.

If the app name already exists under `apps/`, ask whether to modify or rename — never overwrite silently.

### 2. Flesh out the idea

Before writing anything, research the app's real deployment facts — official image, required env vars, ports, volumes, healthcheck endpoints. Use the app's official docs / linuxserver.io / image page via web fetch. Never guess ports or env var names.

Design rules:

- **Images:** official or well-maintained images, pinned to a specific major/minor tag (never `:latest` — Arcane Redeploy pulls the tag; unpinned tags make syncs non-reproducible).
- **Services:** the app plus only the deps it actually needs (db, cache, runner). No speculative sidecars.
- **Persistence:** named volumes, never host bind mounts for app data (Arcane manages projects in its own data dir; bind mounts break portability).
- **Networking:** one internal network per app. Publish only ports the user must reach. Frontends/proxies talk over the internal network without published ports.
- **Healthchecks:** add a healthcheck to any service another service `depends_on` with `condition: service_healthy` (Arcane's deploy wait requires it).
- **`restart: unless-stopped`** on long-running services.
- **Compose-defined Arcane tags** where they help:

```yaml
x-arcane:
  tags:
    - name: <category>   # e.g. media, database, automation
      color: blue
```

If the idea leaves real choices open (database engine, exposed port, auth method, optional variants), present the options and recommendation in one short question round. If the idea is clear, proceed without asking.

### 3. Write the files

`compose.yaml`:

- Canonical filename `compose.yaml` (Arcane's first choice).
- Every service that consumes env vars gets `env_file: .env` — this is what lets Arcane UI overrides (stored in `project.env`, merged into the effective `.env`) reach containers.
- Reference env vars as `${VAR:-default}` in the compose file only when the value is deployment-shaped (port, hostname); secrets and app config stay in `.env`.
- Keep all relative file references inside the app dir (Arcane syncs the whole compose-file directory, so companion files like config fragments work; paths pointing outside the project are rejected in `COMPOSE_FILE`/`COMPOSE_ENV_FILES`).

`.env` (committed):

- Non-secret defaults only.
- Secrets as `CHANGE_ME` placeholders with a trailing comment: `# override in Arcane UI (Projects → app → .env), never commit real secrets`.
- No inline comments on the same line as a value you expect to override in Arcane is fine to keep — Arcane rewrites the value in place preserving the comment.

`.env.example`:

- Same keys as `.env`, every key commented with what it does and what's safe to commit.

### 4. Validate

If `docker compose` is available:

```
docker compose --project-directory apps/<app-name> config -q
```

Fix any errors before finishing. If docker is unavailable, do a careful YAML sanity pass and say validation was skipped.

### 5. Commit and hand off

1. `git add apps/<app-name> && git commit -m "apps: add <app-name>"` (ask before pushing).
2. Emit the Arcane import JSON, ready to paste at **Projects → Create Project ▾ → From Git Repo → Import JSON**:

```json
[
  {
    "syncName": "<app-name>",
    "gitRepo": "<repo-name-as-registered-in-arcane>",
    "branch": "<branch>",
    "dockerComposePath": "apps/<app-name>/compose.yaml",
    "autoSync": true,
    "syncInterval": 5,
    "syncDirectory": true
  }
]
```

`gitRepo` must match the repository **name** configured in Arcane under **Customization → Git Repositories** — if unknown, ask the user or note the placeholder. Defaults: `branch: main`, `syncInterval: 5`.

3. Finish with a short report: services created, ports, volumes, secret vars to override in Arcane, and the reminder that compose edits happen in this repo (Arcane shows git-synced compose read-only; `.env` overrides happen in Arcane).

## Editing an existing app

All compose changes happen in the gitops repo, then Arcane syncs them (manually or via Auto Sync). Never instruct the user to edit the compose file in Arcane — it is read-only for git-synced projects. `.env` values are the exception: overrides belong in Arcane's `.env` editor, not in git, when they contain secrets or are instance-specific.
