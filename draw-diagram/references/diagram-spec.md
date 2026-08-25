# Excalidraw diagram spec reference

The Excalidraw workflow authors a JSON **diagram spec**, not raw Excalidraw
JSON. The builder measures every label with the real Excalidraw font metrics,
places nodes on a grid, routes orthogonal connectors around the boxes, and emits
a valid `.excalidraw` scene plus a rendered PNG.

Hand-writing scene JSON reliably produces the defects this pipeline exists to
prevent: labels wider than their box, connectors drawn through components,
arrowheads landing on text, and edge labels stacked on other lines.

```bash
node <skill-dir>/scripts/excalidraw/diagram.mjs docs/src/system.diagram.json \
  --scene docs/src/system.excalidraw \
  --png docs/assets/system.png \
  --scale 2 --padding 32
```

`--scene`/`--png` default to the spec path with the extension swapped. Other
flags: `--no-png`, `--background <color>`, `--padding 0..256`, `--scale 0.25..4`.

## Top level

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | Rendered above the drawing, left aligned. |
| `subtitle` | string | One line under the title; good place for scope, environment, date. |
| `style` | `"clean"` \| `"sketch"` | `clean` (default) is crisp and neutral; `sketch` is Excalidraw's hand-drawn look. |
| `nodes` | array | Required. See below. |
| `groups` | array | Optional boundaries drawn behind the nodes. |
| `edges` | array | Optional connectors. |
| `legend` | array | `{ "kind": "store", "label": "Data store" }` or `{ "edgeKind": "async", "label": "Asynchronous" }`. |
| `note` | string | Small footnote under the legend. |
| `iconsDir` | string | Directory for bare icon filenames, relative to the spec. |
| `layout` | object | Spacing overrides (see Tuning). |
| `font` | object | `title`, `subtitle`, `label`, `sublabel`, `edge`, `groupTitle`, `note` sizes. |
| `colors` | object | `text`, `muted`, `title`, `canvas`. `canvas` must match the export background. |
| `roles`, `groupKinds`, `edgeKinds` | object | Add or override palette entries. |

## Nodes

```json
{ "id": "orch", "col": 2, "row": 1, "kind": "service",
  "label": "Agent Orchestrator", "sublabel": "plans and runs jobs",
  "icon": "mdi--robot-outline.svg" }
```

| Field | Notes |
| --- | --- |
| `id` | Unique; edges and groups refer to it. |
| `col`, `row` | Zero-based grid cell. Required. Two nodes may not share a cell. |
| `colSpan`, `rowSpan` | Default 1. A row-spanning node stretches to fill its rows. |
| `label` | Wrapped automatically to the node width; keep it to one short phrase. |
| `sublabel` | Smaller muted second line: technology, runtime, or ownership. |
| `kind` | `actor`, `client`, `edge`, `service`, `worker`, `queue`, `store`, `external`, `platform`, `accent`. Defaults to `service`. |
| `icon` | Filename inside `iconsDir`, or a path relative to the spec. Must be an `.svg` file that resolves inside one of those two directories; absolute paths and paths that escape them are rejected. |
| `width`, `height` | Escape hatch; the grid sizes nodes without them. |
| `fill`, `stroke`, `textColor` | Per-node overrides when a role is not enough. |

Columns are tiers of the system (clients → edge → services → data → third
party) and rows are peers within a tier. Keeping that discipline is what makes
the routing come out clean.

## Groups

```json
{ "id": "vpc", "title": "AWS VPC — private subnets", "kind": "boundary",
  "cols": [2, 4], "rows": [0, 4] }
```

A group covers an inclusive rectangular cell range and is drawn behind the
nodes, with the grid gaps widened to make room for its border and title.
`kind` is `zone` (soft grey panel), `boundary` (dashed trust boundary), or
`plain`.

## Edges

```json
{ "from": "orch", "to": "queue", "label": "enqueue job", "kind": "async" }
```

| Field | Notes |
| --- | --- |
| `kind` | `sync` (default), `async`, `data`, `control`, `secure`. |
| `label` | Placed on the clearest straight run of its own path; wrapped if space is tight. |
| `fromSide`, `toSide` | Force `"left" \| "right" \| "top" \| "bottom"` when the automatic choice reads wrong. |
| `bidirectional` | Adds a second arrowhead. |
| `color`, `strokeStyle`, `labelColor` | Per-edge overrides. |

Connectors are chosen from straight, L, Z, U, and staircase shapes, scored on
length, bends, and boundary crossings, then spread across shared lanes and
node sides. They are drawn behind the boxes, so a connector never sits on top
of a component.

## Tuning

`layout` overrides, with defaults: `nodeWidth` 210, `minNodeHeight` 74,
`colGap` 104, `rowGap` 58, `margin` 56, `nodePadX` 14, `nodePadY` 14,
`iconSize` 30, `iconGap` 8, `sublabelGap` 5, `groupPad` 26,
`groupTitleHeight` 30, `groupSeparation` 14, `laneStep` 16, `titleGap` 40.

Widen `colGap` when many labelled connectors share a vertical lane; raise
`nodeWidth` when labels wrap awkwardly.

## Limits

The builder rejects a spec above any of these before it lays anything out: 2 MiB
of JSON, 500 nodes, 1000 edges, 50 groups, 50 legend items, `col`/`row` above
200, `colSpan`/`rowSpan` above 50, 10,000 grid cells, 200-character labels,
300-character titles, and 256 KiB per icon. `layout` and `font` values must be
finite numbers in range. A very dense grid is also refused at routing time.

These sit far above a diagram anyone can read, so hitting one means the spec is
wrong, or the drawing wants splitting into several.

## Reproducibility

Element ids, seeds, and nonces are derived from the spec, not from the clock or
a random source, so rebuilding an unchanged spec produces a byte-identical
scene and PNG. Diffs on a generated scene therefore reflect real changes.

## Warnings

The builder prints `ok: N elements, no layout warnings` when everything placed
cleanly. Otherwise it reports, and each has a specific fix:

| Warning | Fix |
| --- | --- |
| `connector A -> B could not find a clean route` | Move a node, or set `fromSide`/`toSide`. |
| `connector A -> B passes through X` | Same, or leave a free cell for the connector to pass through. |
| `label "..." had no clear space on its path` | Shorten the label, widen `colGap`, or move the node. |
| `label of X is wider than its box` | Shorten the label or raise `nodeWidth`. |
| `Excalidraw would drop on import: ...` | A malformed element; report it rather than shipping the scene. |

## Icons

```bash
node <skill-dir>/scripts/excalidraw/icons.mjs \
  'mdi:database@#2b8a3e' 'simple-icons:redis@#2b8a3e' --out docs/assets/icons
```

Fetches from Iconify over HTTPS, rejects SVGs containing scripts, event
handlers, `foreignObject`, or remote references, normalizes the canvas size,
and prints a provenance table (set, author, license, source URL) to paste into
the diagram's icon-sources section. Colour each icon to match its node stroke
so a diagram keeps one voice.

## Example

Three complete, rendered specs to start from rather than a blank file:

| Spec | Shows |
| --- | --- |
| `examples/system-architecture.diagram.json` | Six tiers, two boundaries, twenty labelled connectors, icons, legend, and note. |
| `examples/release-pipeline.diagram.json` | A left-to-right process with a trust boundary, a `rowSpan` store spanning a whole tier, and `control`/`secure`/`data` edge kinds. |
| `examples/multi-region-topology.diagram.json` | Two mirrored region boundaries with an empty corridor row between them, `bidirectional` replication edges pinned with `fromSide`/`toSide`, and a `layout.colGap` override. |

The corridor trick in the last one is worth copying: leaving a row free between
two boundaries gives the long cross-boundary connectors a lane of their own,
instead of forcing them through occupied cells.
