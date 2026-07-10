---
name: arch-design
description: Produces a well-thought-out architecture design document with editable, PNG-rendered diagrams. Researches current best practices, clarifies requirements interactively, and offers three detail levels. Before diagramming, asks the user to choose either Python `diagrams`/Graphviz or Excalidraw. Prefers simple, standard technology unless a concrete need forces complexity. Use for architecture designs, system designs, HLDs, system diagrams, and architecture proposals or ADRs.
compatibility: Requires web research capability. Python diagrams require `uv` and Graphviz `dot`; bundled Excalidraw PNG export requires Node.js ^20.19 or >=22.12 and its pinned Playwright/Chromium renderer. Manual editor export is also supported. Ask before any global/system install or browser download.
metadata:
  author: gurbakhshish
  sources: https://diagrams.mingrammer.com and https://excalidraw.com
  spec: https://agentskills.io/specification
---

# Architecture Design

Produce a well-reasoned architecture design document with source-controlled, editable diagrams. Design only — do not implement the system while this skill is active unless the user explicitly changes the task.

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
- **User-selected diagram tool.** Ask the user to choose Python `diagrams`/Graphviz or Excalidraw unless they already explicitly selected one. Preserve editable source (`.py` or `.excalidraw`), render PNGs, and reference them in the document. Regenerate diagrams whenever the architecture changes materially.
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

## Choose the diagram tool

Before drafting diagrams, use the interactive question tool to ask the user to pick one:

- **Python `diagrams` + Graphviz** — best for formal infrastructure views, automatic layout, and verified cloud/Kubernetes/provider icons. Source files are Python.
- **Excalidraw** — best for editable, collaborative, hand-drawn views and side-by-side design exploration. Source files use Excalidraw's open JSON format.

Recommend the option that best fits the audience, but do not silently choose it. If the user already explicitly requested one, confirm that choice in the proposal rather than asking a redundant question. Use one tool consistently for a diagram set unless the user requests mixed or comparison views.

## Python diagrams toolchain (when selected)

The `diagrams` library renders through the **Graphviz** system binary. Verify these only when Python diagrams are selected:

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

## Python diagrams authoring and output conventions

- **Source code** lives in `docs/src/` (one file per diagram, e.g. `docs/src/system_context.py`).
- **Rendered PNGs** live in `docs/assets/` (e.g. `docs/assets/system_context.png`).
- **Always run from the repository root**, because the `filename` below is resolved relative to the current directory.
- Always set `show=False` (never auto-open) and `outformat="png"`.
- The `filename` value has **no extension**; PNG is added automatically.
- Create the output directory first: `mkdir -p docs/assets`.
- If the project already has an established docs layout, adapt the paths to match it and stay consistent.
- Keep diagrams readable: use `direction`, `graph_attr` (e.g. `fontsize`, `bgcolor`, `pad`), and `Cluster` to group related nodes. Avoid wall-of-icons diagrams; split into multiple focused views instead.

## Diagram visual-quality standard

- **Render and inspect every PNG.** After rendering, use the environment's image-reading capability (for example, `read` on each PNG) to inspect the actual output. A successful renderer exit code is not sufficient.
- **Iterate until the output passes.** Regenerate any diagram with clipped, overlapping, or ambiguous labels; lines crossing labels; unnecessary edge crossings; excessive empty space; or unreadable text at normal document width. Do not report diagrams as complete before this check passes.
- **Use a consistent visual baseline.** Default to a white background and consistent typography, colors, line weight, padding, and spacing across the diagram set. For Python diagrams, use explicit `node_attr` font settings, `splines="ortho"`, deliberate `nodesep`/`ranksep`, and shared `GRAPH_ATTR`/`NODE_ATTR` constants or a helper.
- **Keep labels short.** Use at most two concise lines per node. Put implementation detail in the document, not in icon captions. Prefer a node title over a title plus a long subtitle.
- **Use meaningful icons carefully.** In Python diagrams, use verified provider/framework icons and avoid `Blank` when an appropriate icon exists. In Excalidraw, use simple labeled shapes by default; only embed icons that remain legible and whose source is trusted.
- **Choose layouts intentionally.** Start with left-to-right context/deployment views and top-to-bottom sequential flows, then use visual inspection to choose the clearer layout. Use containers/clusters only for meaningful boundaries; split diagrams rather than overcrowding them.
- **Limit visual complexity.** One responsibility per node, only the edges needed for the view's purpose, and split a diagram when it cannot remain clear with short labels.

## Run Python diagrams

```bash
# Render one diagram file without installing diagrams globally.
uv run --no-project --with diagrams python docs/src/system_context.py

# Render all diagram source files.
for f in docs/src/*.py; do
  uv run --no-project --with diagrams python "$f"
done
```

If the project already manages Python dependencies and includes `diagrams`, use the project's normal Python command instead. The official `diagrams` workflow is to execute the Python file directly.

### Verified Python quick reference (correct import paths for diagrams 0.25.x)

```python
# docs/src/system_context.py
from diagrams import Diagram
from diagrams.aws.compute import EC2
from diagrams.aws.database import RDS
from diagrams.aws.network import ELB
from diagrams.onprem.client import Users

GRAPH_ATTR = {
    "fontsize": "24",
    "fontname": "Sans-Serif",
    "bgcolor": "white",
    "pad": "0.6",
    "nodesep": "0.9",
    "ranksep": "1.0",
    "splines": "ortho",
}
NODE_ATTR = {"fontname": "Sans-Serif", "fontsize": "15"}

with Diagram(
    "System Context",
    filename="docs/assets/system_context",  # -> docs/assets/system_context.png
    outformat="png",
    show=False,
    direction="LR",
    graph_attr=GRAPH_ATTR,
    node_attr=NODE_ATTR,
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

GRAPH_ATTR = {
    "fontsize": "24",
    "fontname": "Sans-Serif",
    "bgcolor": "white",
    "pad": "0.6",
    "nodesep": "0.9",
    "ranksep": "1.0",
    "splines": "ortho",
}
NODE_ATTR = {"fontname": "Sans-Serif", "fontsize": "15"}

with Diagram(
    "Container View",
    filename="docs/assets/container",
    outformat="png",
    show=False,
    direction="TB",
    graph_attr=GRAPH_ATTR,
    node_attr=NODE_ATTR,
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

## Excalidraw authoring and PNG rendering (when selected)

### Source and output conventions

- Keep editable scenes in `docs/src/` as one `.excalidraw` file per diagram, for example `docs/src/system_context.excalidraw`.
- Render PNGs to `docs/assets/` with the matching basename, for example `docs/assets/system_context.png`.
- Treat the `.excalidraw` file as the source of truth; never edit the generated PNG directly.
- Use a white `viewBackgroundColor`, enable `exportBackground`, disable dark-mode export unless requested, and use consistent export padding and scale across the diagram set.
- Preserve top-level `type`, `version`, `source`, `elements`, `appState`, and `files`. Keep stable element IDs/seeds when generating JSON so unchanged diagrams do not churn.
- Generated scenes must import successfully into Excalidraw. Embedded images/icons belong in `files`; do not use external image URLs or embeddables for a self-contained architecture artifact.
- Prefer short labels, simple rounded shapes, deliberate containers, and directional arrows. Keep the hand-drawn style readable rather than decorative.

### Conditional toolchain check

First prefer an existing project-local Excalidraw renderer and its documented command. Otherwise use this skill's tested, pinned renderer in `scripts/excalidraw-renderer/`. Resolve that path relative to this `SKILL.md` and verify only what the selected path needs:

```bash
node --version
npm --prefix <skill-dir>/scripts/excalidraw-renderer ls --depth=0
```

If dependencies are absent, run `npm --prefix <skill-dir>/scripts/excalidraw-renderer ci --ignore-scripts`. The lockfile pins Excalidraw, React, Vite, and Playwright. The renderer self-hosts Excalidraw's packaged fonts/assets, permits only its loopback origin, and blocks external requests during export.

Playwright also needs its matching Chromium build. Attempt the render first; if it reports that Chromium is unavailable, ask before running `npm --prefix <skill-dir>/scripts/excalidraw-renderer exec -- playwright install chromium` because this is a large browser download. Ask before any global or system package install. For sensitive/private diagrams, use the local network-blocked renderer rather than a hosted editor.

### PNG rendering methods

Use this order unless the repository already has an approved renderer:

1. **Bundled official-API renderer — recommended for automation.** Use this skill's `scripts/excalidraw-renderer/` harness unless the repository already has an approved equivalent. It loads the scene's `elements`, `appState`, and `files`, self-hosts the pinned Excalidraw package and fonts, lets the official exporter load the scene fonts, calls `exportToBlob` in pinned Playwright/Chromium, blocks external requests, disables scene embedding, enforces canvas limits, and writes the Blob as PNG. The API uses browser canvas and does not run in plain Node without a complete DOM/canvas implementation. See the [official export utilities](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/export).
2. **Official Excalidraw editor export — simplest/manual reference.** Open or import the `.excalidraw` file, choose **Export image**, enable **Background**, choose a consistent scale, and export PNG. This has first-party fidelity but is interactive and less reproducible; browser automation may drive the same workflow when permitted.
3. **Official SVG export followed by rasterization — strong fallback.** Use `exportToSvg`, then convert the self-contained SVG with a pinned renderer such as `resvg`, `rsvg-convert`, or a tested CairoSVG setup. Validate fonts, embedded images, filters, and dimensions because SVG rasterization can differ from canvas PNG export.
4. **Browser canvas/container screenshot — last-resort fallback.** Load the scene in a fixed viewport/DPR, hide all editor UI, clear selection/caret state, zoom to content, capture the composed canvas/container, and trim only outer background whitespace. This is not equivalent to export and is sensitive to zoom, crop, overlays, fonts, and browser version.
5. **Third-party CLI — opt-in only.** Use only when the user or repository approves it. Pin the exact version or commit, inspect its implementation and install scripts, ensure it supports every scene feature in use, and prohibit runtime CDN/code downloads. Young CLIs may omit frames, images, freedraw, fonts, or true Excalidraw rough rendering.

Render from the repository root with absolute source/output paths (or otherwise resolve them before changing directories):

```bash
npm --prefix <skill-dir>/scripts/excalidraw-renderer run render -- \
  "$PWD/docs/src/system_context.excalidraw" \
  "$PWD/docs/assets/system_context.png" \
  --scale 2 --padding 32 --background '#ffffff'
```

The renderer accepts `--scale` from `0.25` to `4`, `--padding` from `0` to `256`, and `--background`. Its browser-side call has this shape:

```js
import { exportToBlob } from "@excalidraw/excalidraw";

await document.fonts.ready;
const png = await exportToBlob({
  elements: scene.elements,
  appState: {
    ...scene.appState,
    exportBackground: true,
    exportEmbedScene: false,
    exportWithDarkMode: false,
    viewBackgroundColor: "#ffffff",
  },
  files: scene.files ?? {},
  mimeType: "image/png",
  exportPadding: 32,
  getDimensions: (width, height) => ({
    width: width * 2,
    height: height * 2,
    scale: 2,
  }),
});
```

Pin the Excalidraw package, browser revision, OS/container, fonts, locale, viewport, DPR, scale, background, and padding when reproducible pixels matter. Inspect the final PNG regardless of rendering method.

## Architecture workflow

1. **Understand the request.**
   - Restate the goal, scope, audience, constraints, and success criteria.
   - Identify functional and non-functional requirements (scale, latency, availability, security, cost, compliance).

2. **Choose the diagram tool.**
   - Ask the user to pick **Python `diagrams` + Graphviz** or **Excalidraw**, unless they already explicitly selected one.
   - Explain the short trade-off and record the choice. Do not silently infer it from personal preference.

3. **Verify only the selected toolchain.**
   - For Python diagrams, run `uv --version` and `dot -V`. Ask before any install, and do not render until Graphviz is available.
   - For Excalidraw, identify the approved rendering method, verify its editor/browser/Node requirements, and ask before any global/system install or browser download.

4. **Discovery (research-first).**
   - Explore the existing system/repo: current components, integrations, data, conventions, and constraints.
   - Use `web_search` / `fetch_content` for current best practices, comparisons, limits, and pricing relevant to the design.
   - Use the interactive question tool to clarify ambiguities that would change the design (scope, scale targets, constraints, must-haves, preferences).

5. **Ask for the detail level.**
   - Use one interactive question to have the user pick: **Early Draft**, **POC Ready**, or **Implementation Ready** (see below).
   - Capture the rationale briefly. If unanswered, default to **POC Ready**.

6. **Propose the direction and confirm.**
   - Present the candidate architecture: key components, data flow, technology choices, major tradeoffs, and open questions.
   - Use the interactive question tool to confirm the direction and resolve key decisions **before** drafting the full document. This is the "during the final proposal" clarification point.

7. **Draft the diagrams and document.**
   - Draft the intended diagram set, component labels, and data flows without writing files yet.
   - Draft the document at the chosen detail level (see structure below), including the planned diagram references.
   - Keep diagrams consistent with each other and with the prose.

8. **Review with the user.**
   - Walk through the draft (full for Early Draft; full or faithful section summary for the larger levels), including the intended diagrams and save paths.
   - Get explicit approval, or revise until approved.

9. **Write, render, and inspect the document and diagrams.**
   - After approval, write the selected editable source format (`.py` or `.excalidraw`) in `docs/src/`, render PNGs to `docs/assets/`, and reference them from the document.
   - For Excalidraw, validate that every source scene imports successfully before accepting its PNG.
   - Inspect every rendered PNG with the environment's image-reading tool and apply the Diagram visual-quality standard. Iterate on the source and re-render until it passes.
   - Write the document to the agreed location and regenerate any diagrams touched by review changes.

10. **On material change.**
    - Whenever the architecture changes materially (new/deleted components, changed data flow, topology, or tech choices), update the affected editable diagram source, regenerate the PNGs, and keep the document in sync.

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

Keep diagram sources and assets next to the document using the `docs/src/` and `docs/assets/` convention (adapt to an existing docs layout if one exists). Use `.py` sources for Python diagrams or `.excalidraw` sources for Excalidraw.

## Quality bar

A good architecture design produced by this skill should:

- be grounded in researched evidence and observed system/repo facts, not guesses
- choose the simplest standard approach that meets the requirements, with complexity justified by forcing functions
- include accurate, readable, mutually consistent diagrams that match the prose
- visually inspect every rendered PNG and meet the Diagram visual-quality standard before completion
- make assumptions, tradeoffs, and risks explicit
- cite sources for version-, limit-, or price-dependent claims
- match the chosen detail level without padding

## Important rules

- Design only — do not implement the system while this skill is active unless the user changes the task.
- Use the interactive question tool to clarify during discovery and to confirm the direction before the final proposal.
- Ask the user to pick Python `diagrams`/Graphviz or Excalidraw unless they explicitly selected one already.
- Ask the user to pick a detail level (Early Draft / POC Ready / Implementation Ready) before drafting.
- Research first: use `web_search` / `fetch_content` for current facts instead of relying on memory; cite sources.
- Prefer simple and standard; only choose complex when a concrete need forces it, and state that need.
- Verify only the selected diagram toolchain before rendering. Ask before global/system installs or Chromium downloads.
- Keep editable diagram sources in `docs/src/` and PNGs in `docs/assets/`. For Python diagrams, run from the repo root and set `show=False`; for Excalidraw, preserve importable `.excalidraw` scenes and explicit export settings.
- Visually inspect every rendered PNG and iterate on source/layout until labels, edges, spacing, and icons meet the Diagram visual-quality standard.
- Regenerate diagrams whenever the architecture changes materially, and keep the document in sync.
- Do not write the document, diagram source files, or rendered assets until the user has reviewed the draft and approved it.
- After saving, respond with a concise summary and the saved paths.
