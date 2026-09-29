# Feature recognition

How to turn `analyze_stl.py` output into OpenSCAD constructs, and `compare.py` output into fixes.

## Contents

- Reading the analysis
- Mapping shapes to OpenSCAD
- Common features
- Tessellation matching
- Diagnosing compare output

## Reading the analysis

- **Axis-aligned plane levels** are the heights where the part steps. Every extrusion starts and ends on one of these levels.
- **Bands** are the slabs between consecutive levels. A *constant* band is one `linear_extrude` of its outlines, spanning `from`..`to`. Adjacent bands with the same profile are already merged.
- **VARIES** bands contain one of three things:
  - A taper, chamfer, or fillet. The outline grows or shrinks steadily through the band; add `--levels` inside it to check.
  - A revolved shape (see the revolved-part candidate section).
  - A feature running along another axis, such as a cross hole. Re-run with `--axis x` or `--axis y`, and look for that feature as a constant band there.
- **Section coordinates** are given in the report header: along `z` they are `[x, y]`, along `y` they are `[x, z]`, and along `x` they are `[y, z]`. Map them back before writing `translate()` calls.
- **Cylindrical features** are circles tracked across constant bands. A `hole` becomes a `cylinder()` subtracted over `from`..`to`; a `boss` becomes a `cylinder()` added.
- **Mirror symmetry** tells you to model one half or quarter and use `mirror()`, or `for (s = [-1, 1])` over a symmetric offset.
- **Revolved-part candidate** gives `[radius, axial]` half-profiles. These go straight into `rotate_extrude() polygon(profile)`, translated to the axis centre. For an x or y axis, rotate the result onto that axis.
- **Genus** is the number of through-holes plus handles. Use it to check that no hole was missed.

## Mapping shapes to OpenSCAD

| Analysis shape | OpenSCAD |
|---|---|
| `circle d=D at [u,v] (N segments)` | `translate([u, v]) circle(d = D, $fn = N)` |
| `rect [w, h] at [u,v] angle=a` | `translate([u, v]) rotate(a) square([w, h], center = true)` |
| `rounded_rect [w, h] r=R` | `offset(r = R) offset(delta = -R) square([w, h], center = true)` |
| slot (rounded_rect with R = h/2) | `hull()` of two circles, or the rounded_rect form |
| `polygon points=[...]` | `polygon(points)`. Look for hidden structure first: arcs mean fillets, symmetric halves mean `mirror` |
| hole inside an outline | subtract it from the 2D outline before extruding, or subtract a 3D `cylinder()` |

Build each constant band as `translate([0, 0, from]) linear_extrude(to - from) outline();`. The same applies along x or y after rotating into place.

## Common features

- **Counterbore.** Two stacked hole circle features on the same centre with different diameters and adjacent extents. Model it as two cylinders in one `counterbore()` module.
- **Countersink or cone.** A VARIES band whose circle diameter changes linearly. Use `cylinder(d1 =, d2 =, h =)`.
- **Chamfer on an extrusion.** A VARIES band at the top or bottom of a stack whose outline shrinks by a steady offset. Use `hull()` of two thin `linear_extrude`s of `offset(delta = -c)` outlines, or `linear_extrude(h, scale = s)` for similar-shape tapers.
- **Vertical-edge fillet.** Shows up as a rounded_rect or polygon arcs in the section. Round the 2D outline with `offset(r = R) offset(delta = -R)`.
- **Horizontal-edge fillet.** A VARIES band whose outline changes along a quarter circle. Build it from stacked offsets in a `for` loop only if necessary. Prefer `rotate_extrude` or `hull()` of rounded 2D slices; avoid 3D `minkowski()`, which is slow in CGAL.
- **Taper or draft.** Use `linear_extrude(h, scale = top/bottom)` about the outline centre.
- **Patterns.** Circles or rects repeating at a fixed pitch go in a `for` loop over offsets. Circles on a circle go in `for (a = [0 : 360 / n : 359]) rotate(a) translate([r, 0])`.
- **Shell or wall.** When a band's outline has one hole that is an inset copy of the outer outline, use `difference() { outline(); offset(delta = -t) outline(); }`.
- **Missing corner or partial pattern.** Hole patterns where one position is absent: loop over the full pattern with an explicit skip condition, and comment why.
- **Cosmetic text and logos.** If they obstruct conversion, omit them and model the underlying surface unless the user's initial request explicitly requires them. Record the omitted region; see SKILL.md steps 3 and 7.
- **Knurling, threads, organic surfaces, and initially required markings.** These are freeform: follow the per-region ask in SKILL.md step 6.

## Tessellation matching

The STL approximates curves with facets, and OpenSCAD does the same. Different facet counts leave a deviation of up to the sagitta `r * (1 - cos(180° / N))`.

- If every circle reports the same `segments`, set a global `$fn` to that value.
- If segment counts vary with radius, the source used `$fa`/`$fs` or other CAD. Set `$fn` per feature where the count is known, otherwise use `$fa = 1; $fs = 0.2`, which keeps the sagitta well under the deviation target.
- Hitting the dimension target does not require exact facet parity. The goal is only that faceting doesn't dominate the deviation report.

## Diagnosing compare output

| Symptom | Likely cause | Fix |
|---|---|---|
| bbox delta on one side only | an extrusion height or plane level is wrong | re-read that axis's plane levels |
| MISSING region shaped like a feature | the feature is absent or undersized | add it or enlarge it |
| EXTRA region shaped like a hole | the subtraction is missing or undersized | add or enlarge the subtraction; check `eps` overlap |
| thin hotspot covering a whole planar face | wall thickness or plane offset is wrong | check the band `from`/`to` |
| a MISSING and an EXTRA region of similar volume on opposite sides of a feature | the feature is offset | move it toward the MISSING region by the hotspots' max_dev; confirm with the feature "center off by" line |
| hotspots along edges, max_dev about the size of the edge break | a fillet or chamfer is missing or the wrong size | add it and measure with `--levels` |
| uniform small deviation on every curved surface | `$fn` mismatch | apply tessellation matching |
| feature issue "no matching candidate shape" | the shape kind differs (e.g. rect vs rounded_rect) or the feature is missing | model the reported shape kind |
| feature issue "center off by" | position error | use the analysis centre exactly |
| OpenSCAD warning "may not be a valid 2-manifold" | coincident faces | add `eps` overlap to the subtractions and unions |
