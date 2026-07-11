---
name: arch-design
description: Produces a well-thought-out architecture design document with editable diagrams, rendered as PNG for Excalidraw or SVG for D2. Researches current best practices, clarifies requirements interactively, and offers three detail levels. Before diagramming, recommends Excalidraw as the first choice while allowing the user to choose D2, with Iconify as the source for any icons. Focuses on conceptual, component/data-flow, and control-flow views, plus use-case-specific diagrams. Prefers simple, standard technology unless a concrete need forces complexity. Use for architecture designs, system designs, HLDs, system diagrams, and architecture proposals or ADRs.
compatibility: Requires web research capability. D2 SVG output requires the `d2` CLI. Bundled Excalidraw PNG export requires Node.js ^20.19 or >=22.12 and its pinned Playwright/Chromium renderer. Manual editor export is also supported. Ask before any global/system install or browser download.
metadata:
  author: gurbakhshish
  sources: https://d2lang.com, https://iconify.design, and https://excalidraw.com
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
- **Excalidraw-first, user-selected diagram tool.** Offer Excalidraw as the first and recommended choice, with D2 as the alternative, unless the user already explicitly selected a tool. Preserve editable source (`.d2` or `.excalidraw`), render D2 diagrams as bundled SVGs and Excalidraw diagrams as PNGs, and reference them in the document. Source every non-native icon from Iconify, vendor it locally, and regenerate diagrams whenever the architecture changes materially.
- **Purpose-driven diagram set.** Center the design on (1) a high-level conceptual/context view, (2) a system component view with recognizable icons and explicit data flow, and (3) control-flow views such as sequence, activity, state, or request-lifecycle diagrams. Include only the views that help the audience, and add deployment, data model, security/trust-boundary, integration, or other diagrams when the use case warrants them.
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

- **Excalidraw — recommended first choice.** Best for editable, collaborative, visually expressive views; icon-rich component diagrams; and side-by-side design exploration, with PNG rendering. Source files use Excalidraw's open JSON format.
- **D2 — alternative.** Best when concise text-based source, automatic layout, formal architecture views, and reproducible CLI rendering to bundled SVG are more important. Source files use D2's declarative language.

Recommend Excalidraw by default. Recommend D2 instead only when the audience, repository workflow, automation needs, or explicit user preference makes its text-based and automatic-layout approach a better fit. Do not silently choose either tool. If the user already explicitly requested one, confirm that choice in the proposal rather than asking a redundant question. Use one tool consistently for a diagram set unless the user requests mixed or comparison views.

## Iconify icon sourcing (both tools)

Use [Iconify](https://iconify.design/) as the canonical source for every non-native icon used in D2 or Excalidraw. Simple shapes, text, arrows, and D2's built-in semantic shapes do not need icons.

- **Use icons only when they improve recognition.** Prefer a labeled shape when an icon would be decorative, ambiguous, too small, or visually noisy. Do not put an icon on every node by default.
- **Choose deliberately.** Search Iconify, prefer one coherent icon set per diagram, verify the exact `{prefix}:{name}` identifier, and favor official vendor logos only when the component really is vendor-specific.
- **Verify licensing per icon set.** Iconify aggregates sets with different licenses. Check the selected set's Iconify page, record the icon ID, source URL, creator/set, license, and required attribution in a `Diagram icon sources` section of the architecture document. Do not assume Iconify provides one universal icon license.
- **Vendor exact SVGs.** Store selected icons under `docs/assets/icons/` with stable names such as `mdi--database.svg`. Do not leave runtime dependencies on Iconify API URLs in D2 or Excalidraw sources.
- **Retrieve from the official API.** After verifying the icon in Iconify, download its SVG from `https://api.iconify.design/{prefix}/{name}.svg`. Pin visual choices in the URL when needed, such as `?color=%232F6FEB`, and record that exact URL in the document.
- **Treat SVGs as untrusted input.** Require HTTPS and a successful response, inspect the downloaded file, and reject SVGs containing scripts, event handlers, `foreignObject`, or external references. Do not use an icon that cannot be safely vendored.
- **No silent fallback source.** If Iconify does not have an appropriate icon, use a clear labeled shape instead. Use a different icon source only with explicit user approval and document its provenance/license.

Example retrieval from the repository root:

```bash
mkdir -p docs/assets/icons
curl --fail --location --silent --show-error \
  --proto '=https' --proto-redir '=https' \
  'https://api.iconify.design/mdi/database.svg?color=%232F6FEB' \
  --output docs/assets/icons/mdi--database.svg
```

For **D2**, reference the vendored SVG relative to the `.d2` source file. With the standard layout (`docs/src/*.d2` and `docs/assets/icons/*`), use `icon: ../assets/icons/<file>.svg`. For **Excalidraw**, keep the vendored SVG for provenance and embed its bytes as a `data:image/svg+xml;base64,...` entry in the scene's top-level `files`; the corresponding `image` element must reference that file ID. Never use an Iconify URL as an Excalidraw embeddable or external image.

## D2 toolchain (when selected)

Prefer an existing project-local D2 workflow. Otherwise verify the CLI only after D2 is selected:

```bash
d2 version
d2 layout
```

If `d2` is missing, tell the user D2 is required for the selected path, give the matching official installation instructions below, and ask them to install it. Do not run the installation yourself or silently fall back to Excalidraw.

- **macOS (Homebrew):** `brew install d2`
- **Windows:** use the `.msi` from the [official D2 releases](https://github.com/terrastruct/d2/releases), or use `scoop install main/d2` / `choco install d2` when that package manager is already trusted.
- **From source with Go 1.20+:** `go install oss.terrastruct.com/d2@latest`.
- **Linux or WSL (official installer):** download the script without executing it, inspect it, then run its dry-run mode before deciding whether to execute it:

  ```bash
  install_script="$(mktemp "${TMPDIR:-/tmp}/d2-install.XXXXXX")"
  trap 'rm -f "$install_script"' EXIT
  curl --fail --location --silent --show-error \
    --proto '=https' --proto-redir '=https' \
    https://d2lang.com/install.sh --output "$install_script"
  less "$install_script"
  sh "$install_script" --dry-run
  # Only if the inspected script and dry-run output are acceptable:
  sh "$install_script"
  ```

Prefer the user's existing trusted package manager. Explain that the official shell installer does not verify release signatures; downloading it is not verification, so the user must inspect it before execution. Use the interactive question tool to offer: **I will install it and tell you when ready** or **switch to Excalidraw**. Wait for confirmation, then rerun `d2 version` and `d2 layout` before continuing.

Render D2 output directly as SVG because it is the more reliable, portable output path and preserves vector quality. Always use `--bundle=true` so vendored icons are embedded and the rendered asset is self-contained. Do not render D2 diagrams as PNG unless the user explicitly requests an additional raster copy.

## D2 authoring and output conventions

- **Editable source** lives in `docs/src/` (one `.d2` file per diagram, e.g. `docs/src/system_context.d2`).
- **Rendered SVGs** live in `docs/assets/` with the matching basename (e.g. `docs/assets/system_context.svg`).
- **Vendored icons** live in `docs/assets/icons/` and follow the Iconify sourcing rules above.
- **Always run CLI commands from the repository root** so input and output paths are consistent. D2 resolves each local icon path relative to the `.d2` source file, not the shell working directory; for `docs/src/*.d2`, use `../assets/icons/<file>.svg`.
- Create output directories first: `mkdir -p docs/src docs/assets/icons`.
- If the project already has an established docs layout, adapt the paths and remain consistent.
- **Let the user choose the layout engine.** Run `d2 layout`, present only the engines available in that output, explain the relevant trade-offs, and ask the user to select one before authoring or rendering. Recommend an engine, but do not silently choose it.
  - **ELK — recommended for most architecture diagrams when available.** A mature, actively maintained hierarchical engine with strong orthogonal routing, container handling, and crossing minimization. Prefer it for component/data-flow views and polished architecture layouts.
  - **Dagre — recommended for speed and simpler hierarchies.** D2's fast default engine; useful for straightforward directed graphs and quick drafts, but it can produce less refined routing on complex or container-heavy diagrams.
  - **TALA — recommended for architecture-specific placement control when available.** Designed for software architecture diagrams and supports advanced placement behavior such as per-container direction and position locking. Explain any installation or licensing implications shown by the current toolchain before recommending it.
  - **Other installed engines.** If `d2 layout` reports another engine, inspect `d2 layout <engine>` and current official documentation, then explain its strengths, limitations, and suitability rather than guessing.
- Record the selected engine and use it consistently across the diagram set unless the user approves a per-diagram exception. If the recommended engine is unavailable, explain why another installed option is the best fit; never change engines silently.
- Set `direction: right` for context/deployment views and `direction: down` for sequential flows unless inspection shows another direction is clearer. Favor orthogonal routes and enough spacing to keep edges from crossing labels, icons, components, or container titles whenever the selected engine supports it.
- Treat visual fidelity as the priority. Adjust direction, spacing, containers, and node placement—or split the view—when needed for a cleaner layout rather than accepting a dense or ambiguous automatic render.
- Use containers only for meaningful trust, ownership, network, deployment, or domain boundaries. Avoid wall-of-icons diagrams; split crowded views.
- Prefer shared D2 classes or variables for repeated styling so the diagram set has consistent colors, strokes, fonts, and spacing.
- Format and validate source before rendering. Always use the D2 process exit status as the success signal; D2 can leave a partial output after a rendering error.

## Diagram selection and visual-quality standard

Choose diagrams by the questions they answer, not by filling a fixed quota:

- **High-level conceptual/context diagram:** show the system's purpose, actors, external systems, major boundaries, and primary interactions without implementation detail.
- **System component and data-flow diagram:** show major components, their responsibilities and boundaries, and labeled data movement (direction, protocol/event, and important stores). Use coherent Iconify icons where they materially improve component recognition; keep labels so icons are never the only carrier of meaning.
- **Control-flow diagram(s):** show important runtime behavior with the clearest notation for the use case—typically sequence diagrams for cross-component interactions, activity/flow diagrams for branching workflows, state diagrams for lifecycles, or request/event-flow diagrams for processing paths. Cover critical happy paths and meaningful failure or retry paths when relevant.
- **Use-case-specific diagrams:** add deployment/topology, ER/data model, security/trust-boundary, network, integration, migration, resilience/failure, or observability views only when they answer a material design question. Omit irrelevant views and split overloaded diagrams.

For every selected diagram:

- **Render and inspect every asset.** After rendering, use the environment's file/image-reading capability to inspect the actual SVG or PNG. A successful renderer exit code is not sufficient.
- **Iterate until the output passes.** Regenerate any diagram with clipped, overlapping, or ambiguous labels; lines crossing labels; unnecessary edge crossings; excessive empty space; inconsistent icon scale; or unreadable text at normal document width. Do not report diagrams as complete before this check passes.
- **Use a consistent visual baseline.** Default to a white background and consistent typography, colors, line weight, padding, spacing, Iconify set, and icon treatment across the diagram set. In D2, centralize repeated styling and use a fixed layout/theme/render command for related diagrams.
- **Keep labels short.** Use at most two concise lines per node. Put implementation detail in the document, not in icon captions. Prefer a node title over a title plus a long subtitle.
- **Use meaningful icons carefully.** Source every icon through Iconify and follow its license. Use a consistent visual family and color treatment; preserve brand colors only when they carry meaning. Prefer simple labeled shapes over forced or low-quality icon matches.
- **Choose layouts intentionally.** Start with left-to-right context/deployment views and top-to-bottom sequential flows, then use visual inspection to choose the clearer layout. Use containers only for meaningful boundaries; split diagrams rather than overcrowding them.
- **Limit visual complexity.** One responsibility per node, only the edges needed for the view's purpose, and split a diagram when it cannot remain clear with short labels.

## Run D2

```bash
# Format and validate one diagram.
d2 fmt docs/src/system_context.d2
d2 validate docs/src/system_context.d2

# Use the engine selected by the user from `d2 layout`.
layout_engine="<chosen-layout>"

# Render a deterministic, self-contained SVG from the repository root.
d2 --bundle=true --layout="$layout_engine" --theme=0 --pad=48 \
  docs/src/system_context.d2 docs/assets/system_context.svg

# Format, validate, and render every diagram.
for f in docs/src/*.d2; do
  d2 fmt "$f" && d2 validate "$f" || exit 1
  d2 --bundle=true --layout="$layout_engine" --theme=0 --pad=48 \
    "$f" "docs/assets/$(basename "${f%.d2}").svg" || exit 1
done
```

Keep the layout, theme, and padding consistent across a diagram set. Change them only after inspecting the result, and use the same updated command for every related diagram.

### D2 quick reference

```d2
# docs/src/system_context.d2
direction: right

users: End users {
  shape: person
}

platform: Product platform {
  style: {
    fill: "#EFF6FF"
    stroke: "#2F6FEB"
    border-radius: 12
  }

  web: Web app {
    icon: ../assets/icons/simple-icons--react.svg
  }
  api: API
  db: Primary database {
    icon: ../assets/icons/mdi--database.svg
  }

  web -> api: HTTPS/JSON
  api -> db: SQL
}

users -> platform.web: HTTPS
```

D2 also supports standalone image shapes:

```d2
provider: {
  shape: image
  icon: ../assets/icons/simple-icons--amazonwebservices.svg
}
```

Use standalone image shapes sparingly because a short label is usually clearer in architecture diagrams. Verify D2 syntax and renderer behavior against the [official D2 documentation](https://d2lang.com/tour/) rather than guessing.

## Excalidraw authoring and PNG rendering (when selected)

### Source and output conventions

- Keep editable scenes in `docs/src/` as one `.excalidraw` file per diagram, for example `docs/src/system_context.excalidraw`.
- Render PNGs to `docs/assets/` with the matching basename, for example `docs/assets/system_context.png`.
- Keep vendored Iconify SVGs in `docs/assets/icons/`, even though the scene also embeds them, so provenance and the exact source asset remain reviewable.
- Treat the `.excalidraw` file as the source of truth; never edit the generated PNG directly.
- Use a white `viewBackgroundColor`, enable `exportBackground`, disable dark-mode export unless requested, and use consistent export padding and scale across the diagram set.
- Preserve top-level `type`, `version`, `source`, `elements`, `appState`, and `files`. Keep stable element IDs/seeds when generating JSON so unchanged diagrams do not churn.
- Generated scenes must import successfully into Excalidraw. Embed each sanitized Iconify SVG in `files` as a base64 `data:image/svg+xml` URL with `mimeType: "image/svg+xml"`, and have its image element reference the matching file ID. Do not use external image URLs or embeddables.
- Prefer the installed Excalidraw API/import workflow for image elements and file IDs instead of inventing undocumented JSON fields. If scene JSON is generated directly, compare it with the installed version's schema/types and prove it by reopening and exporting the scene.
- Prefer short labels, simple rounded shapes, deliberate containers, and directional arrows. Keep the hand-drawn style readable rather than decorative, and follow the shared Iconify consistency and licensing rules.
- Prefer elbow/orthogonal arrows over straight or sharply angled arrows. Route connectors around labels, icons, nodes, and container titles whenever possible; do not allow an arrow to cross text or pass through a component when a clear route can avoid it.
- Treat visual fidelity as the priority. Favor clear spacing, deliberate alignment, readable routing, and polished composition over compactness, generation convenience, or minimizing canvas size. Reposition components or enlarge the diagram when needed to preserve clarity.

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
   - Ask the user to pick **Excalidraw (recommended)** or **D2**, unless they already explicitly selected one.
   - Present Excalidraw first and recommend it by default; explain the short trade-off and record the choice. Recommend D2 when concrete workflow or audience needs favor it. Do not silently choose.

3. **Verify only the selected toolchain.**
   - For D2, run `d2 version` and `d2 layout`. If D2 is missing, give the official instructions above, ask the user to install it, and wait for confirmation; do not install it yourself. Present the installed layout engines with a concise explanation and recommendation, then ask the user to choose one. Inspect `d2 layout <engine>` and official documentation for unfamiliar options. Record the choice and use it for bundled SVG rendering; D2 does not require a browser for this workflow.
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
   - Draft the intended diagram set without writing files yet. Start from a high-level conceptual/context view, a component view with icons and explicit data flow, and the control-flow view(s) that best explain runtime behavior; then add or omit use-case-specific views based on the design questions and chosen detail level.
   - For proposed icons, identify candidate Iconify IDs/set, source and license details, and a labeled-shape fallback before review.
   - Draft the document at the chosen detail level (see structure below), including the planned diagram references.
   - Keep diagrams consistent with each other and with the prose.

8. **Review with the user.**
   - Walk through the draft (full for Early Draft; full or faithful section summary for the larger levels), including the intended diagrams and save paths.
   - Get explicit approval, or revise until approved.

9. **Write, render, and inspect the document and diagrams.**
   - After approval, verify each approved Iconify ID, icon-set license/attribution, downloaded SVG safety, and local/self-contained integration.
   - Write the selected editable source format (`.d2` or `.excalidraw`) in `docs/src/`, vendor approved Iconify SVGs in `docs/assets/icons/`, render D2 assets as bundled SVGs or Excalidraw assets as PNGs in `docs/assets/`, and reference them from the document.
   - Add the `Diagram icon sources` provenance/license section when any icons are used.
   - For D2, format and validate each source, render with `--bundle=true`, then check the SVG render exit status. For Excalidraw, validate that every source scene imports successfully before accepting its PNG.
   - Inspect every rendered SVG or PNG with the environment's file/image-reading tool and apply the Diagram visual-quality standard. Iterate on the source and re-render until it passes.
   - Write the document to the agreed location and regenerate any diagrams touched by review changes.

10. **On material change.**
    - Whenever the architecture changes materially (new/deleted components, changed data flow, topology, or tech choices), update the affected editable diagram source, regenerate the rendered assets, and keep the document in sync.

## Detail levels

Ask the user to choose one. Each level is progressively more detailed.

### Level 1 — Early Draft

- **Goal:** fast alignment on direction and scope; not yet implementable.
- **Audience:** stakeholders, quick technical sanity check.
- **Diagrams:** 1 — high-level conceptual/System Context view. If runtime behavior is the central design question, add one concise control-flow view rather than overloading the context diagram.
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
- **Diagrams:** 2–4 — high-level conceptual/System Context + component view with icons and explicit data flow + one appropriate control-flow view (sequence, activity, state, or request/event flow). Add one use-case-specific view when needed.
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
- **Diagrams:** 4–7 — high-level conceptual/System Context + component view with icons and explicit data flow + control-flow view(s), plus the relevant deployment/topology, data model, security/trust-boundary, integration, resilience, or observability views required by the use case.
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

Keep diagram sources and assets next to the document using the `docs/src/` and `docs/assets/` convention (adapt to an existing docs layout if one exists). Use `.d2` sources for D2 or `.excalidraw` sources for Excalidraw, and keep vendored Iconify SVGs in `docs/assets/icons/`.

## Quality bar

A good architecture design produced by this skill should:

- be grounded in researched evidence and observed system/repo facts, not guesses
- choose the simplest standard approach that meets the requirements, with complexity justified by forcing functions
- include accurate, readable, mutually consistent diagrams that match the prose
- visually inspect every rendered SVG or PNG and meet the Diagram visual-quality standard before completion
- make assumptions, tradeoffs, and risks explicit
- cite sources for version-, limit-, or price-dependent claims
- match the chosen detail level without padding

## Important rules

- Design only — do not implement the system while this skill is active unless the user changes the task.
- Use the interactive question tool to clarify during discovery and to confirm the direction before the final proposal.
- Ask the user to pick Excalidraw (recommended first choice) or D2 unless they explicitly selected one already.
- Ask the user to pick a detail level (Early Draft / POC Ready / Implementation Ready) before drafting.
- Research first: use `web_search` / `fetch_content` for current facts instead of relying on memory; cite sources.
- Prefer simple and standard; only choose complex when a concrete need forces it, and state that need.
- Verify only the selected diagram toolchain before rendering. Never install missing D2 yourself; give the user instructions and wait for confirmation. When D2 is selected, list the installed layout engines, explain and recommend the suitable options, and let the user choose; never silently select or switch engines. Ask before any other global/system install or Chromium download.
- Source every needed icon from Iconify, verify its icon-set license, vendor and inspect the SVG, record provenance, and fall back to a labeled shape rather than silently using another source.
- Keep editable diagram sources in `docs/src/`, vendored icons in `docs/assets/icons/`, and rendered assets in `docs/assets/`. For D2, render bundled SVGs from the repo root and validate `.d2` sources; for Excalidraw, preserve importable, self-contained scenes and explicit PNG export settings.
- Build the diagram set around a high-level conceptual view, a component/data-flow view with useful icons, and appropriate control-flow views, then add only the use-case-specific diagrams that answer material questions.
- Visually inspect every rendered SVG or PNG and iterate on source/layout until labels, edges, spacing, and icons meet the Diagram visual-quality standard.
- Regenerate diagrams whenever the architecture changes materially, and keep the document in sync.
- Do not write the document, diagram source files, or rendered assets until the user has reviewed the draft and approved it.
- After saving, respond with a concise summary and the saved paths.
