---
name: draw-diagram
description: Creates polished, source-controlled diagrams from requirements, prose, sketches, or existing systems. Recommends Excalidraw first, with D2 as a text-based alternative; uses Iconify icons, prioritizes visual fidelity and clean connector routing, preserves editable sources, renders outputs, and visually inspects every result. Use for architecture, conceptual, component, data-flow, control-flow, sequence, process, deployment, network, ER, trust-boundary, and other technical diagrams.
compatibility: Requires an interactive question capability and file/image inspection. Icon sourcing requires web access. D2 SVG output requires the `d2` CLI. The bundled Excalidraw builder and renderer require Node.js ^20.19 or >=22.12 and its pinned Playwright/Chromium. Manual editor export is also supported. Ask before any global/system install or browser download.
metadata:
  author: gurbakhshish
  source: extracted from the arch-design skill in this repository
  sources: https://d2lang.com, https://iconify.design, and https://excalidraw.com
  spec: https://agentskills.io/specification
---

# Draw Diagram

Create polished, accurate diagrams with editable source files and inspected rendered assets. Draw and revise diagrams only; do not redesign the underlying system or implement it unless the user explicitly expands the task.

## When to use

Use this skill when the user wants to:

- draw, generate, recreate, or improve a diagram
- turn prose, requirements, code, or an existing system into a visual
- create architecture, conceptual, context, component, data-flow, control-flow, sequence, activity, state, process, deployment, network, ER/data-model, integration, trust-boundary, migration, resilience, or observability diagrams
- convert a rough sketch or existing diagram into an editable, source-controlled artifact
- improve diagram layout, routing, icons, consistency, or visual fidelity

Do not use this skill when the user primarily needs architecture decisions or a full HLD; use an architecture-design skill for that, then use this drawing workflow for the approved views.

## Core behavior

- **Diagram work only.** Represent the supplied design faithfully. Do not invent load-bearing components, flows, or behavior; surface ambiguity and ask the user when it changes the meaning.
- **Excalidraw first, user choice.** Offer **Excalidraw (recommended)** first and **D2** as the alternative unless the user already selected a tool. Explain the trade-off and do not silently choose.
- **Generate, never hand-write.** Excalidraw scenes come from a diagram spec built by the bundled toolchain. Hand-authored scene JSON is what produces overflowing labels, connectors drawn through components, and stacked arrowheads.
- **Purpose before notation.** Identify the question each diagram must answer, its audience, and the correct level of detail before drawing.
- **Visual fidelity first.** Prioritize readable composition, deliberate alignment, whitespace, coherent styling, and clean routing over compactness or generation convenience.
- **Editable and reproducible.** Preserve `.excalidraw` or `.d2` source, vendor icons locally, render the final asset, and keep generated output synchronized with source.
- **Inspect actual output.** A successful command is not enough. Inspect every rendered asset and iterate until it meets the quality bar.
- **Review before persistence.** For a new or materially changed diagram, summarize the proposed view, content, notation, and paths before writing files. Obtain approval unless the user explicitly asks for immediate generation or supplies an already-approved specification.

## Choose the diagram tool

Use the interactive question tool to offer:

- **Excalidraw — recommended first choice.** Best for editable, collaborative, visually expressive diagrams; icon-rich component views; controlled composition; and polished presentation. Source is a JSON diagram spec that generates an editable `.excalidraw` scene and a rendered PNG.
- **D2 — text-based alternative.** Best for concise source, reviewable diffs, automatic layout, formal graph-oriented views, and reproducible CLI rendering. Source is `.d2`; render to bundled SVG.

Recommend Excalidraw by default. Recommend D2 when repository workflows, automation, diffability, or graph complexity make declarative source and automatic layout more valuable. If the user already named a tool, use it without asking redundantly. Use one tool consistently across a related diagram set unless the user approves mixed output.

## Choose useful diagram types

Choose diagrams by the questions they answer rather than filling a quota:

- **Conceptual/context:** purpose, actors, external systems, major boundaries, and primary interactions without implementation detail.
- **Component and data flow:** major components, responsibilities, ownership or trust boundaries, important stores, and labeled data movement including direction and protocol/event where useful.
- **Control flow:** runtime behavior using sequence diagrams for cross-component interactions, activity/flow diagrams for branching workflows, state diagrams for lifecycles, or request/event-flow diagrams for processing paths.
- **Deployment/topology:** runtime placement, networks, regions/zones, scaling units, and infrastructure relationships.
- **Data model:** entities, important attributes, keys, and cardinality at the level the audience needs.
- **Security/trust boundary:** identities, entry points, privilege changes, sensitive data movement, and enforcement points.
- **Process/migration/resilience/observability:** operational stages, transitions, failure and recovery paths, telemetry flow, or rollout steps when those are the material question.

Omit irrelevant views. Split a crowded diagram rather than combining different abstraction levels or unrelated questions.

## Iconify icon sourcing

Use [Iconify](https://iconify.design/) as the canonical source for every non-native icon. Simple shapes, labels, arrows, and D2 semantic shapes do not require icons.

- Use icons when they improve recognition, especially in component diagrams. Keep a text label so an icon is never the only carrier of meaning.
- Prefer one coherent icon set per diagram. Verify the exact `{prefix}:{name}` identifier; use vendor logos only for genuinely vendor-specific components.
- Verify the selected icon set's license on Iconify. Record icon ID, source URL, creator/set, license, and required attribution in a nearby `Diagram icon sources` section or agreed provenance file.
- Vendor exact SVGs under `docs/assets/icons/` by default, using stable names such as `mdi--database.svg`. Adapt to an existing project layout when present.
- Retrieve through HTTPS from `https://api.iconify.design/{prefix}/{name}.svg`; record the exact URL, including visual query parameters.
- Treat SVGs as untrusted input. Require a successful HTTPS response and reject scripts, event handlers, `foreignObject`, or external references.
- If Iconify has no suitable icon, use a clear labeled shape. Use another source only with explicit approval and documented provenance/license.

Use the bundled helper, which fetches over HTTPS, rejects unsafe SVGs, normalizes the icon canvas, and prints a provenance table to paste into the icon-sources section:

```bash
node <skill-dir>/scripts/excalidraw/icons.mjs \
  'mdi:database@#2b8a3e' 'simple-icons:redis@#2b8a3e' \
  --out docs/assets/icons
```

Colour each icon to match its node stroke so the set reads as one system. For D2, or when the helper is unavailable, fetch the same URL with `curl --fail --proto '=https'` and inspect the result before use.

For D2 sources in `docs/src/`, use `icon: ../assets/icons/<file>.svg`. For Excalidraw, name the vendored file in the spec's `icon` field; the builder embeds its bytes into the scene's `files` map. Never leave runtime Iconify URLs in diagram sources.

## Shared visual-quality standard

For every diagram:

- Use a white background unless the user or existing style guide requires another treatment.
- Keep typography, palette, strokes, arrowheads, icon treatment, padding, and spacing consistent across a set.
- Keep node labels to at most two concise lines when possible. Move explanations into accompanying prose or a legend.
- Use one responsibility or concept per node. Use containers only for meaningful trust, ownership, network, deployment, or domain boundaries.
- Label important edges clearly without placing labels where connectors intersect them.
- Avoid connectors crossing text, icons, nodes, container titles, or one another whenever a clearer route is possible.
- Preserve enough whitespace for normal document-width readability. Do not shrink text or icons to rescue an overcrowded view.
- Split diagrams when abstraction levels conflict or visual density remains high after layout iteration.
- Include a legend only when color, line style, or notation has a meaning that is not obvious.
- Check semantic accuracy as well as appearance: actors, direction, cardinality, boundaries, labels, and flow ordering must match the source material.

Reject and regenerate output with clipped or overlapping labels, ambiguous arrows, avoidable edge crossings, inconsistent icon scale, excessive empty space, poor balance, unreadable text, or misleading grouping.

## Excalidraw workflow

Excalidraw scenes are **generated from a diagram spec**, never hand-written. The bundled builder measures every label with real Excalidraw font metrics, places nodes on a grid, routes orthogonal connectors around components, puts connector labels in clear space, checks the scene against Excalidraw's own loader, and renders the PNG.

Read `references/diagram-spec.md` for the full spec reference, and start from the example whose shape is closest — `examples/system-architecture.diagram.json` (layered architecture), `examples/release-pipeline.diagram.json` (left-to-right process with a trust boundary), or `examples/multi-region-topology.diagram.json` (mirrored regions with cross-boundary replication) — rather than a blank file.

### Authoring conventions

- Keep the spec at `docs/src/<name>.diagram.json`, the generated scene at `docs/src/<name>.excalidraw`, and the PNG at `docs/assets/<name>.png`.
- The spec is the source of truth. Regenerate after every change; never edit the generated scene or the PNG by hand.
- Model columns as tiers of the system (clients, edge, services, async, data, third party) and rows as peers inside a tier. Clean routing follows from disciplined placement.
- One responsibility per node: `label` names it, `sublabel` carries the technology, runtime, or owner.
- Use `groups` for real trust, network, ownership, or deployment boundaries only.
- Choose `kind` for meaning (`client`, `service`, `worker`, `queue`, `store`, `external`, ...), not for decoration, and add a legend when a diagram uses more than a few roles.
- Prefer fixing crowding by moving a node or widening `layout.colGap` before reaching for `fromSide`/`toSide` overrides.
- Use `style: "clean"` for architecture and marketing material; `style: "sketch"` when the hand-drawn Excalidraw voice is wanted.

### Toolchain check

Resolve paths relative to this `SKILL.md`:

```bash
node --version
npm --prefix <skill-dir>/scripts/excalidraw ls --depth=0
```

If dependencies are absent, run:

```bash
npm --prefix <skill-dir>/scripts/excalidraw ci --ignore-scripts
```

The lockfile pins Excalidraw, React, Vite, and Playwright. The builder self-hosts fonts and assets, permits only its loopback origin, and blocks external requests, service workers, and off-host WebSockets. Chromium runs sandboxed; a host that cannot provide the sandbox prints a warning rather than failing.

Attempt a build before installing a browser. If Chromium is missing, ask before this large download:

```bash
npm --prefix <skill-dir>/scripts/excalidraw exec -- playwright install chromium
```

Ask before any global or system install. For sensitive diagrams, prefer the local network-blocked toolchain over a hosted editor.

### Build and render

Run from the repository root with absolute or repo-relative paths:

```bash
node <skill-dir>/scripts/excalidraw/diagram.mjs docs/src/system_context.diagram.json \
  --scene docs/src/system_context.excalidraw \
  --png docs/assets/system_context.png \
  --scale 2 --padding 32
```

The builder validates the spec, fails loudly on duplicate ids, occupied cells, unknown kinds, and unknown node references, and prints one of:

- `ok: N elements, no layout warnings` — the scene placed cleanly.
- one `warning:` line per defect — a connector with no clean route, a connector crossing a component, a label with no clear space, a label wider than its box, or an element Excalidraw would drop on import.

Treat every warning as a defect. Fix it in the spec and rebuild; do not ship a warned build. Then inspect the PNG and iterate on anything the checks cannot see, such as ordering, emphasis, or a grouping that reads wrong.

`--no-png` writes only the scene. `--background` also sets the colour that connector labels mask with, so keep it consistent between builds.

Outputs must stay under the directory the command runs from, and the builder refuses to write through a symbolic link. Both apply to `render.mjs` and `icons.mjs` too. When a destination elsewhere is genuinely wanted, confirm the real path with the user and pass `--force`.

To re-render a scene that was edited in the Excalidraw editor, use the renderer directly:

```bash
node <skill-dir>/scripts/excalidraw/render.mjs docs/src/system_context.excalidraw \
  docs/assets/system_context.png --scale 2 --padding 32
```

Editor round-trips are supported but lossy in one direction: the spec cannot absorb manual edits, so fold any keeper change back into the spec.

### Renderer alternatives

Use these only when the bundled toolchain is unavailable, and say so in the delivery notes:

1. **Official editor export:** first-party fidelity but interactive and less reproducible.
2. **Official `exportToSvg` followed by tested rasterization:** validate fonts, embedded images, filters, and dimensions.
3. **Fixed browser canvas/container screenshot:** last resort; hide UI, clear selections, fit content, and validate crop and fonts.
4. **Third-party CLI:** opt-in only; pin and inspect it, prohibit runtime code downloads, and verify support for every scene feature used.

Pin renderer/browser versions, fonts, locale, viewport, DPR, scale, background, and padding when reproducible pixels matter.

## D2 workflow

### Toolchain and layout choice

After D2 is selected, check:

```bash
d2 version
d2 layout
```

If D2 is missing, tell the user it is required and ask them to install it or switch to Excalidraw. Do not install it yourself. Prefer the user's trusted package manager and current official D2 installation instructions.

Run `d2 layout`, present only engines shown as available, explain their trade-offs, and ask the user to choose before authoring:

- **ELK — recommended for most architecture diagrams when available:** mature hierarchical layout, strong orthogonal routing, container handling, and crossing minimization.
- **Dagre — recommended for speed and simple hierarchies:** fast and useful for quick directed graphs, but often less polished for complex or container-heavy views.
- **TALA — recommended for architecture-specific placement control when available:** designed for software architecture diagrams and supports advanced placement behavior. Explain current installation or licensing implications.
- **Other installed engines:** inspect `d2 layout <engine>` and current official documentation; explain strengths and limitations rather than guessing.

Record the user's choice and use it consistently unless they approve a per-diagram exception. Never silently select or switch engines.

### Authoring conventions

- Keep `.d2` sources in `docs/src/` and matching bundled SVGs in `docs/assets/`.
- Render SVG by default for reliability, portability, and vector quality. Produce PNG only when explicitly requested as an additional raster copy.
- Always pass `--bundle=true` so vendored icons are embedded and the SVG is self-contained.
- Run commands from the repository root. Resolve icon paths relative to each `.d2` source, not the shell working directory.
- Use `direction: right` for context/deployment views and `direction: down` for sequential flows unless inspection shows another direction is clearer.
- Favor orthogonal routes and enough spacing to avoid crossing labels, icons, nodes, and container titles whenever the chosen engine supports it.
- Use shared D2 classes or variables for repeated styles and a consistent render command across the set.
- Treat visual fidelity as the priority. Adjust direction, spacing, containers, and grouping—or split the diagram—rather than accepting a dense automatic layout.

### Render D2

```bash
mkdir -p docs/src docs/assets/icons

# Use the engine explicitly selected by the user from `d2 layout`.
layout_engine="<chosen-layout>"

# Name the diagrams being worked on. `d2 fmt` rewrites in place, so never let
# this list expand to files this task did not author.
sources=(docs/src/<name>.d2)

for f in "${sources[@]}"; do
  d2 fmt "$f" && d2 validate "$f" || exit 1
  d2 --bundle=true --layout="$layout_engine" --theme=0 --pad=48 \
    "$f" "docs/assets/$(basename "${f%.d2}").svg" || exit 1
done
```

Use D2's process status as the success signal; a failed render can leave a partial output. Verify syntax and renderer behavior against current official D2 documentation instead of guessing.

## Drawing workflow

1. **Understand the request.**
   - Identify the diagram's purpose, audience, source material, required content, desired abstraction level, and output location.
   - Inspect relevant files, existing diagrams, styles, and project conventions before asking questions.
   - Ask focused questions only where ambiguity changes semantics or layout materially.

2. **Choose the tool.**
   - Offer **Excalidraw (recommended)** first and **D2** second unless already selected.
   - Explain the trade-off and record the choice.

3. **Choose notation and views.**
   - State what question each proposed diagram answers.
   - Select conceptual, component/data-flow, control-flow, or other use-case-specific views as needed.
   - Avoid combining incompatible abstraction levels.

4. **Verify only the selected toolchain.**
   - For Excalidraw, check the bundled builder's dependencies and ask before browser or system downloads.
   - For D2, verify the CLI, present available layout engines with explanations and a recommendation, and ask the user to choose.

5. **Propose the drawing.**
   - Summarize nodes and their tiers, groups, boundaries, key edges, notation, orientation, icons, and save paths.
   - Identify candidate Iconify IDs and labeled-shape fallbacks.
   - Get approval unless immediate generation was explicitly requested or the specification is already approved.

6. **Author and build.**
   - For Excalidraw, write the diagram spec, vendor icons, and run the builder; for D2, write the `.d2` source and render it.
   - Record icon provenance/license when icons are used.

7. **Inspect and iterate.**
   - Clear every builder warning first; each one names a defect to fix in the source.
   - Then inspect the actual PNG or SVG with available image tools, including a close crop of any dense region.
   - Fix semantic errors, clipping, overlap, poor balance, unreadable labels, awkward arrows, and avoidable crossings.
   - Repeat until visual fidelity and semantic accuracy pass the quality standard.

8. **Deliver.**
   - Report concise saved paths for source, rendered assets, and icons/provenance.
   - State the chosen tool and D2 layout engine when applicable, plus any residual rendering limitations.

9. **Keep synchronized.**
   - On material changes to nodes, relationships, boundaries, flow, or terminology, update source and regenerate affected assets.

## Output locations

Ask where to save files before writing when the user has not specified a location. Defaults:

- Excalidraw spec and generated scene: `docs/src/<diagram-name>.diagram.json` and `docs/src/<diagram-name>.excalidraw`
- D2 source: `docs/src/<diagram-name>.d2`
- rendered assets: `docs/assets/<diagram-name>.png` for Excalidraw or `docs/assets/<diagram-name>.svg` for D2
- vendored icons: `docs/assets/icons/`

Adapt to an established repository layout and keep source, assets, and references consistent.

## Completion checklist

Before reporting completion, verify:

- the diagram answers its intended question at the correct abstraction level
- labels, direction, ordering, boundaries, and relationships match the source material
- editable source imports or validates successfully
- icons are safe, local, licensed, and documented
- the Excalidraw build reported no warnings, and its spec, scene, and PNG are in sync
- D2 uses the user-selected available layout engine
- no connector unnecessarily crosses text, icons, nodes, or container titles
- typography, spacing, alignment, icon scale, and styling are coherent
- the actual rendered SVG or PNG was inspected and regenerated after the last material change
- source paths and rendered paths are reported clearly
