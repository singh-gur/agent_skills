---
name: arch-design
description: Produces a well-thought-out architecture design document with code-generated diagrams. Researches current best practices via the web, clarifies requirements interactively at discovery and before the final proposal, and offers three detail levels (Early Draft, POC Ready, Implementation Ready). Prefers simple, standard, boring technology over complex ones unless a concrete need forces complexity. Draws architecture diagrams as code with the Python `diagrams` library and renders them to PNG. Use when the user asks to "design an architecture", "system design", "architecture doc", "high-level design", "HLD", "draw a system diagram", or to produce an architecture proposal/ADR.
compatibility: Requires web research capability for current facts, Python via `uv`, and Graphviz `dot` to render diagrams; ask before any global or system package install.
metadata:
  author: gurbakhshish
  source: diagrams via https://diagrams.mingrammer.com
  spec: https://agentskills.io/specification
---

# Architecture Design

Produce a well-reasoned architecture design document with code-generated diagrams. Design only — do not implement the system while this skill is active unless the user explicitly changes the task.

## When to use

Use this skill when:

- the user wants an architecture design, system design, high-level design (HLD), or architecture proposal
- a new system, service, or major feature needs its shape decided before implementation
- the user asks for architecture diagrams, component breakdowns, or technology tradeoffs
- the work needs to align multiple stakeholders or be handed to engineers to build

Do not use this skill for a single implementation plan with phases (use a planning skill instead), or for trivial changes that need no design.

## Core behavior

- **Design only.** Produce the design document and diagrams; do not start building the system. If the user wants implementation, they will say so.
- **Clarify interactively.** Use the environment's interactive question/ask tool (e.g. `ask_user`) to remove ambiguity at two points: (a) during discovery, when missing requirements/constraints would change the design; and (b) before the final proposal, to confirm direction and key decisions. Do not silently assume.
- **Research first.** For frameworks, services, patterns, limits, pricing, versions, and comparisons, look up current sources via `web_search` / `fetch_content` rather than relying on model memory. Cite sources for claims that depend on them.
- **Simple and standard by default.** Prefer proven, boring technology and the fewest moving parts that satisfy the requirements. Only introduce complexity when a concrete forcing function demands it, and say what that forcing function is.
- **Diagrams as code.** Author diagrams in Python with the `diagrams` library, render them to PNG, and reference them in the document. Regenerate diagrams whenever the architecture changes materially.
- **Review before writing.** Draft the design and intended diagrams, walk the user through them, and only persist document, diagram source, and rendered asset files once they approve (or request edits).
- **Keep tooling portable where you can.** The interactive-question and web-research capabilities are the point; name the concrete tools (`ask_user`, `web_search`, `fetch_content`) when present, but fall back to the environment's equivalents if those names are unavailable.

## Design principles — simple/standard first

Apply these before proposing anything complex:

- **Prefer standard, proven technology.** Choose boring, widely-used options by default. Justify every non-standard choice explicitly.
- **Prefer fewer moving parts.** Merge components that do not need to scale, deploy, or evolve independently. A single well-factored service beats three services plus a coordination problem.
- **Prefer managed/serverless over self-hosted** unless control, cost, compliance, or performance demands otherwise — and name the reason.
- **Make complexity pay for itself.** Microservices, event sourcing, CQRS, sharding, multi-region, custom protocols, etc. are only justified by a concrete non-functional requirement or constraint. State the forcing function in the document.
- **Record key decisions as ADRs.** For each non-trivial decision, capture context, options considered, the choice, and the tradeoffs.
- **Make assumptions and risks explicit.** Never hide a load-bearing assumption.

## Research-first rule

- Use `web_search` (prefer 2–4 varied query angles) and `fetch_content` to ground choices in current, version-specific information.
- Prioritize official documentation and release notes over secondary sources for API behavior, limits, quotas, pricing, and supported regions/versions.
- Cite sources (links) in the document wherever a claim depends on a version, limit, or price.
- If a source cannot be found, say so and mark the claim as an assumption rather than presenting a guess as fact.

## Diagrams toolchain

The `diagrams` library renders through the **Graphviz** system binary. Verify these before generating any diagram:

```bash
# 1. uv (Python tool runner)
uv --version

# 2. Graphviz system binary (REQUIRED to render PNG/JPG/SVG/PDF)
dot -V
```

The Python `diagrams` package does **not** need to be globally installed when using the recommended `uv run --with diagrams` command below.

**If something is missing:**

- If `uv` is missing, ask the user how they want Python dependencies handled before installing anything.
- If `dot -V` fails, Graphviz is missing or unavailable. Ask the user before running any OS package-manager command, especially anything requiring `sudo`.
- Suggested Graphviz install commands, after explicit user approval:
  - Fedora/RHEL: `sudo dnf install graphviz`
  - Debian/Ubuntu: `sudo apt install graphviz`
  - macOS: `brew install graphviz`
  - Arch: `sudo pacman -S graphviz`

Do not proceed to render until `dot -V` succeeds — without the Graphviz binary, `diagrams` fails with `ExecutableNotFound: failed to execute PosixPath('dot')`. If Graphviz cannot be installed, tell the user the exact command they need to run and stop rendering.

## Diagrams authoring and output conventions

- **Source code** lives in `docs/src/` (one file per diagram, e.g. `docs/src/system_context.py`).
- **Rendered PNGs** live in `docs/assets/` (e.g. `docs/assets/system_context.png`).
- **Always run from the repository root**, because the `filename` below is resolved relative to the current directory.
- Always set `show=False` (never auto-open) and `outformat="png"`.
- The `filename` value has **no extension**; PNG is added automatically.
- Create the output directory first: `mkdir -p docs/assets`.
- If the project already has an established docs layout, adapt the paths to match it and stay consistent.
- Keep diagrams readable: use `direction`, `graph_attr` (e.g. `fontsize`, `bgcolor`, `pad`), and `Cluster` to group related nodes. Avoid wall-of-icons diagrams; split into multiple focused views instead.

### Run diagrams

```bash
# Render one diagram file without installing diagrams globally.
uv run --no-project --with diagrams python docs/src/system_context.py

# Render all diagram source files.
for f in docs/src/*.py; do
  uv run --no-project --with diagrams python "$f"
done
```

If the project already manages Python dependencies and includes `diagrams`, use the project's normal Python command instead. The official `diagrams` workflow is to execute the Python file directly.

### Verified quick reference (correct import paths for diagrams 0.25.x)

```python
# docs/src/system_context.py
from diagrams import Diagram
from diagrams.aws.compute import EC2
from diagrams.aws.database import RDS
from diagrams.aws.network import ELB
from diagrams.onprem.client import Users

GRAPH_ATTR = {
    "fontsize": "32",
    "bgcolor": "transparent",
    "pad": "0.6",
}

with Diagram(
    "System Context",
    filename="docs/assets/system_context",  # -> docs/assets/system_context.png
    outformat="png",
    show=False,
    direction="LR",
    graph_attr=GRAPH_ATTR,
):
    Users("End Users") >> ELB("Load Balancer") >> EC2("Web App") >> RDS("Primary DB")
```

Grouping with `Cluster` (also verified import paths):

```python
# docs/src/container.py
from diagrams import Diagram, Cluster
from diagrams.aws.compute import EC2
from diagrams.aws.database import RDS
from diagrams.aws.network import ELB
from diagrams.aws.storage import S3
from diagrams.onprem.client import Users

with Diagram(
    "Container View",
    filename="docs/assets/container",
    outformat="png",
    show=False,
    direction="TB",
):
    users = Users("End Users")
    lb = ELB("Load Balancer")
    with Cluster("Application Tier"):
        web = [EC2("web-1"), EC2("web-2")]
    db = RDS("Primary DB")
    assets = S3("Static Assets")

    users >> lb >> web >> db
    web >> assets
```

Node import paths come from providers such as `diagrams.aws.*`, `diagrams.onprem.*`, `diagrams.gcp.*`, `diagrams.azure.*`, `diagrams.k8s.*`, and `diagrams.generic.*`. When unsure of an exact class name, verify it against the installed package rather than guessing.

## Architecture workflow

1. **Understand the request.**
   - Restate the goal, scope, audience, constraints, and success criteria.
   - Identify functional and non-functional requirements (scale, latency, availability, security, cost, compliance).

2. **Verify the diagrams toolchain.**
   - Run the `uv --version` and `dot -V` checks above. Ask before any install, and do not render until Graphviz is available.

3. **Discovery (research-first).**
   - Explore the existing system/repo: current components, integrations, data, conventions, and constraints.
   - Use `web_search` / `fetch_content` for current best practices, comparisons, limits, and pricing relevant to the design.
   - Use the interactive question tool to clarify ambiguities that would change the design (scope, scale targets, constraints, must-haves, preferences).

4. **Ask for the detail level.**
   - Use one interactive question to have the user pick: **Early Draft**, **POC Ready**, or **Implementation Ready** (see below).
   - Capture the rationale briefly. If unanswered, default to **POC Ready**.

5. **Propose the direction and confirm.**
   - Present the candidate architecture: key components, data flow, technology choices, major tradeoffs, and open questions.
   - Use the interactive question tool to confirm the direction and resolve key decisions **before** drafting the full document. This is the "during the final proposal" clarification point.

6. **Draft the diagrams and document.**
   - Draft the intended diagram set, component labels, and data flows without writing files yet.
   - Draft the document at the chosen detail level (see structure below), including the planned diagram references.
   - Keep diagrams consistent with each other and with the prose.

7. **Review with the user.**
   - Walk through the draft (full for Early Draft; full or faithful section summary for the larger levels), including the intended diagrams and save paths.
   - Get explicit approval, or revise until approved.

8. **Write the document and diagrams.**
   - After approval, write diagram code in `docs/src/`, render PNGs to `docs/assets/`, and reference them from the document.
   - Write the document to the agreed location and regenerate any diagrams touched by review changes.

9. **On material change.**
    - Whenever the architecture changes materially (new/deleted components, changed data flow, topology, or tech choices), update the affected diagram code and regenerate the PNGs, and keep the document in sync.

## Detail levels

Ask the user to choose one. Each level is progressively more detailed.

### Level 1 — Early Draft

- **Goal:** fast alignment on direction and scope; not yet implementable.
- **Audience:** stakeholders, quick technical sanity check.
- **Diagrams:** 1 — System Context (high level).
- **Sections:**
  - Problem & Goals
  - Scope (in / out)
  - High-level components
  - Key assumptions
  - Options considered (brief)
  - Open questions

### Level 2 — POC Ready

- **Goal:** enough detail to build a proof of concept or spike.
- **Audience:** engineers building the POC.
- **Diagrams:** 2–3 — System Context + Container/Component view + one Sequence or Data-flow.
- **Sections:** everything in Early Draft, plus:
  - Component breakdown with responsibilities
  - Technology choices and rationale (web-researched, cited)
  - Data flow
  - Key interfaces / contracts (sketch)
  - Non-functional requirements at a high level (performance, scale, security)
  - Risks and tradeoffs

### Level 3 — Implementation Ready

- **Goal:** engineers can implement without re-discovering the design.
- **Audience:** implementation team.
- **Diagrams:** 4–6 — System Context + Container + Component + Deployment/Topology + Sequence(s) + Data Model (ER).
- **Sections:** everything in POC Ready, plus:
  - Detailed component contracts and APIs
  - Data model / schema
  - Deployment and topology
  - Scaling and capacity
  - Security and compliance
  - Observability (logs, metrics, traces, dashboards, alerts)
  - Failure modes and resilience (retries, fallbacks, degradation)
  - Migration / rollout plan
  - Architecture Decision Records (ADRs) for key decisions
  - Test strategy

Pick the **lowest level that satisfies the user's purpose.** Do not gold-plate an Early Draft with Implementation-Ready depth unless asked.

## Choosing the output location

Ask where to save the document before writing. Default options:

- `docs/architecture.md`
- `docs/architecture/<name>.md`

Keep diagram sources and assets next to the document using the `docs/src/` and `docs/assets/` convention (adapt to an existing docs layout if one exists).

## Quality bar

A good architecture design produced by this skill should:

- be grounded in researched evidence and observed system/repo facts, not guesses
- choose the simplest standard approach that meets the requirements, with complexity justified by forcing functions
- include accurate, readable, mutually consistent diagrams that match the prose
- make assumptions, tradeoffs, and risks explicit
- cite sources for version-, limit-, or price-dependent claims
- match the chosen detail level without padding

## Important rules

- Design only — do not implement the system while this skill is active unless the user changes the task.
- Use the interactive question tool to clarify during discovery and to confirm the direction before the final proposal.
- Ask the user to pick a detail level (Early Draft / POC Ready / Implementation Ready) before drafting.
- Research first: use `web_search` / `fetch_content` for current facts instead of relying on memory; cite sources.
- Prefer simple and standard; only choose complex when a concrete need forces it, and state that need.
- Verify the diagrams toolchain (`uv` and Graphviz `dot`) before rendering; ask before installing anything globally or via an OS package manager.
- Keep diagram code in `docs/src/` and PNGs in `docs/assets/`; run from the repo root; set `show=False`.
- Regenerate diagrams whenever the architecture changes materially, and keep the document in sync.
- Do not write the document, diagram source files, or rendered assets until the user has reviewed the draft and approved it.
- After saving, respond with a concise summary and the saved paths.
