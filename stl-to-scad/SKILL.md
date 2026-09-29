---
name: stl-to-scad
description: Converts STL meshes into clean, parametric OpenSCAD (.scad) code that reproduces the part's geometry and dimensions, using a measured analyze, model, verify, and refine loop (bounding-box and feature dimensions, surface deviation, volume IoU). Use when asked to convert, reverse-engineer, remodel, or recreate an STL or 3D-print mesh as OpenSCAD/SCAD code, or to make an STL editable or parametric.
compatibility: Requires OpenSCAD 2021.01 or newer on PATH (or the OPENSCAD env var) and uv. Network access is needed on first use so uv can fetch the scripts' Python packages.
metadata:
  author: gurbakhshish
  version: "1.0"
---

# STL to SCAD

Turn `<name>.stl` into `<name>.scad` that renders to the same solid, written as readable parametric OpenSCAD, plus `<name>.report.md` recording how close it is.

## Defaults

Use these acceptance targets unless the user gives others:

| Criterion | Target |
|---|---|
| Bounding-box and feature dimensions | within ±0.1 mm |
| Two-way surface deviation | max ≤ 0.25 mm |
| Volume IoU | ≥ 0.99 |
| Improve iterations | at most 8 |

Keep the STL's coordinate frame, orientation, and units. The output must overlay the STL exactly, so never re-center, rotate, or scale it unless the user asks.

## Scripts

Paths are relative to this skill's directory. Run them with `uv run --script scripts/<name>.py …`; uv installs each script's dependencies from its inline metadata, so no project setup is needed. Every script supports `--help`.

- `scripts/analyze_stl.py` reports mesh health, bounding box, plane levels, mirror symmetry, and cross-section bands. Section outlines come classified as circle, rect, rounded_rect, or polygon, along with circle features and revolve profiles.
- `scripts/compare.py` renders a candidate `.scad` and scores it against the reference. It reports PASS/FAIL per criterion, located missing/extra material, deviation hotspots, and feature-dimension issues, and writes diff PNGs. Exit code: 0 pass, 1 fail, 2 render/load error.
- `scripts/repair_stl.py` makes a non-watertight reference watertight and reports how far the surface moved.
- `scripts/extract_region.py` emits a `polyhedron()` module for one box-bounded region. Use it only after the user approves a mesh-derived region.

## Workflow

### 1. Preflight

1. Confirm the input STL exists and that `openscad --version` and `uv --version` both work. If either tool is missing, stop and tell the user what to install.
2. If `<name>.scad` or `<name>.report.md` already exists next to the input, ask before overwriting.
3. Create the scratch directory `.stl2scad-<name>/` next to the input. All iterations and artifacts go there.

### 2. Analyze

1. Run `analyze_stl.py <stl> --json <scratch>/analysis-z.json`. When any band is marked VARIES, or a feature may run along another axis, also run it with `--axis x` and `--axis y`. Add `--levels` to split a band at points you need to inspect.
2. If the mesh is not watertight, run `repair_stl.py <stl> <scratch>/reference.stl`. Use the repaired mesh as the comparison reference only if its bbox delta is 0 and the surface moved at most 10% of the deviation target. Otherwise ask the user whether to continue with deviation-only metrics (no IoU, unreliable sections), supply a better file, or cancel.
3. If the analysis flags suspicious units, ask the user before scaling anything.
4. If the analysis says the part looks rotated, model it in an axis-aligned frame and put one `rotate()`/`multmatrix()` at the top level.

Read [references/feature-recognition.md](references/feature-recognition.md) to turn the analysis into OpenSCAD constructs.

### 3. Plan the feature tree

Before writing code, write a short feature tree in the scratch directory: base bodies, then added features, then removed features. Note where each dimension comes from (a band, a circle feature, a plane level). Pick constructs in this order of preference; the lower entries cost readability:

1. Primitives and `linear_extrude` of classified 2D shapes
2. `rotate_extrude` of a revolve profile
3. `offset`/`hull` for fillets, chamfers, and tapers
4. `polygon()` built from analysis points, for irregular 2D outlines
5. `polyhedron()` from `extract_region.py`, only with user approval (see step 6)

Snap measured values to design intent when they fall within the dimension tolerance (4.199 → 4.2, 15.996 → 16), then let the verify step confirm them.

### 4. Write the candidate

Write `<scratch>/iter-1.scad` following [references/scad-style.md](references/scad-style.md) from the start. Match tessellation to the reported `segments` (see feature-recognition), so the comparison measures real modelling error rather than facet noise.

### 5. Verify

```
uv run --script scripts/compare.py <reference> <scratch>/iter-N.scad --work-dir <scratch> --label iter-N \
    [--dim-tol 0.1 --max-dev 0.25 --min-iou 0.99]
```

- Exit code 2 means a SCAD or render error. Fix it; the attempt does not count as an iteration.
- If your client accepts image input, look at `diff_iso.png`, `diff_top.png`, `diff_front.png`, and `diff_right.png`. Grey is the reference, red is missing material, blue is extra.
- Every run appends to `<scratch>/history.jsonl`, which feeds the report.

### 6. Improve or rework

Handle the largest errors first: missing/extra material regions, then feature issues, then hotspots. Use the diagnosis table in feature-recognition.md. Fix every issue that has clear evidence, leave passing features untouched, and save each attempt as the next `iter-N.scad`.

- **Measure, don't guess.** If a value is uncertain, re-run `analyze_stl.py` with `--levels` or another `--axis` instead of nudging numbers.
- **Revert regressions.** If an iteration scores worse than the best one so far (higher max deviation or lower IoU), continue from the best iteration.
- **Rework when stuck.** If two consecutive iterations fail to improve the best result, the decomposition is probably wrong (wrong extrusion axis, missed feature, wrong base shape). Re-plan the feature tree before tuning numbers again.
- **Freeform regions.** Some regions still fail after two primitive-based attempts: organic surfaces, sculpted blends, embossed text or logos, threads, or polygons flagged as too many vertices. **Stop and ask the user about each region.** Give its location and bbox, the current deviation there, and the diff render, then offer these options:
  1. Approximate with primitives and accept the residual deviation there. Record it as an accepted residual.
  2. Reproduce the region exactly with `extract_region.py` using the splice pattern from its `--help`. The mesh data goes in a clearly delimited section at the end of the file.
  3. Leave the region out, for example a logo the user doesn't want. Record it.

  Re-run compare after acting on the answer. Accepted residuals and exclusions count as satisfied criteria for their regions only.

### 7. Stop

Stop the loop when compare passes. Also stop after 8 iterations, using the best iteration. Continue to cleanup either way.

### 8. Clean up the code

Refactor the chosen iteration against the checklist in scad-style.md, then run compare once more on the result. The cleanup must not make any metric worse. If it does, fix or revert the refactor. This last run supplies the reported final metrics.

### 9. Deliver

1. Write the final code to `<name>.scad` next to the input STL.
2. Write `<name>.report.md` next to it, filling in [assets/report-template.md](assets/report-template.md) with the rows from `history.jsonl`.
3. Delete the scratch directory.
4. Tell the user the output paths, the final metrics table, whether every target passed, any residual issues, and the decisions they made.

## Edge cases

- **Several bodies.** If the STL holds several disjoint bodies, give each its own module and call them all at the top level.
- **Slow renders.** When compare reports long render times (CGAL in OpenSCAD 2021 is slow), avoid `minkowski()` on 3D shapes and high `$fn` on large boolean stacks; do the rounding in 2D with `offset()` instead.
- **No flat faces.** If the part has no planar faces at all (a fully organic mesh), tell the user up front that clean CSG cannot match it. Ask whether to proceed region by region or stop.
