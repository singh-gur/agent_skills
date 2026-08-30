---
name: setup-ci
description: Gathers CI requirements through a four-area intake and scaffolds Concourse or Forgejo CI pipelines for the current repository, wiring build, test, and security gates to real project commands. Use when asked to set up, scaffold, or improve CI for a repo, or to choose between Concourse and Forgejo CI.
metadata:
  author: gurbakhshish
  spec: https://agentskills.io/specification
---

# Setup CI

Collect pipeline requirements from the user, inspect the repository, and produce CI configuration that matches the chosen platform and quality bar.

## Intake (required before pipeline work)

Collect the four areas below before generating any CI configuration. Skip an area only when it is already explicit in the user's request or conversation.

If the environment provides an interactive question tool, collect the full intake in one form with at most 4 related questions; otherwise ask in chat. Question rules:

- Use choice questions for fixed decisions; use multi-select where several answers can apply (artifacts, quality gates).
- Do not turn multi-answer decisions into freeform questions; collect extra paths, tool names, and details in a separate freeform question.
- Ask no more than 4 questions total unless a prior answer is too vague to proceed safely.
- Use repository inspection, not questions, for facts discoverable in files.
- Do not read secrets, `.env`, credentials, kubeconfigs, or auth stores to fill gaps; ask the user for sanitized placeholders or secret names instead.

### 1. CI platform

Which CI flavor to target:

- **Concourse** — pipeline/resources/jobs model
- **Forgejo CI** — workflow-style pipelines (Forgejo Actions compatible)
- **Unsure** — recommend based on repo evidence and user constraints

### 2. Tech stack and build artifacts

What must be built, packaged, or published (multi-select):

- Tests/checks only
- Python package/wheel
- Node/npm package
- Binary/library artifact
- Container image
- Helm chart
- Terraform/IaC plan
- SBOM/provenance
- Deployment/promotion
- Other or unsure — recommend, with details in extra context

Collect details in the freeform extra-context question: languages and runtimes, monorepo vs single-package layout, paths that trigger CI, Dockerfile locations, tags, and registries.

### 3. Testing and quality gates

Which checks must run in CI (multi-select):

- Unit tests
- Integration tests
- End-to-end tests
- Lint/format checks
- Type check
- Coverage threshold
- SAST scan
- SCA/dependency scan
- Container scan
- Export results to Faraday
- Other or unsure — recommend

Collect details in the freeform extra-context question: preferred tools (e.g. Semgrep, Trivy, Grype, Bandit), external result export (e.g. Faraday server format and upload mechanism), coverage thresholds, required approvals, and branch protection expectations.

### 4. Additional pipeline context

Ask for anything else needed to implement CI correctly:

- target branches and trigger rules (push, PR, tags, schedules)
- runner or worker constraints (labels, privileged Docker, GPU, self-hosted vs shared)
- secrets and integrations (registry auth, deploy keys, webhooks) as names only, never values
- deployment or promotion steps (staging, production, GitOps)
- existing pipeline files to extend vs replace
- compliance, signing, provenance, or artifact retention requirements

## Implementation workflow

After intake:

1. Inspect the repository for stack evidence: manifests, Dockerfiles, test commands, existing CI configs, and scripts.
2. Confirm the chosen CI flavor still fits; if the user was unsure, state your recommendation and proceed unless they object.
3. Scaffold or update pipeline files appropriate to the platform:
   - **Concourse**: `ci/pipeline.yml` (or project-conventional path), with clear resources, jobs, and task steps
   - **Forgejo CI**: `.forgejo/workflows/*.yml` (or `.gitea/workflows` if the repo already uses that layout)
4. Wire build, test, and security stages to real project commands discovered in the repo; do not invent commands when existing ones are documented.
5. Add commented placeholders for secrets, registry URLs, Faraday upload steps, and external integrations the user named but did not provide values for.
6. Validate syntax when practical (`fly validate-pipeline`, action lint, or YAML sanity checks if tooling exists).
7. Summarize what was created, assumptions made, and what the user must configure locally (secrets, workers, remote pipeline set-up).

## Output format

Structure the final report as:

### CI Requirements Captured

- Bullet summary of user answers by area (platform, stack/artifacts, quality gates, extras).

### Repository Evidence

- Key files and commands used, with `file_path:line_number` references when available.

### Generated CI

- List files created or updated and their role.

### Operator Notes

- Required secrets, credentials, runners, and manual setup steps (e.g. `fly set-pipeline`, Forgejo workflow enablement, Faraday endpoint configuration).
- Follow-up choices if anything was left ambiguous.

## Rules

- Complete intake before generating pipelines; use structured choice questions for material fixed decisions instead of unstructured chat.
- Keep pipeline changes minimal and aligned with repository conventions.
- Do not commit or push unless the user explicitly asks.
- Do not expose or request raw secret values in chat; use placeholders and document secret names for the CI platform.
