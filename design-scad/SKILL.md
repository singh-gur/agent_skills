---
name: design-scad
description: Designs new parametric OpenSCAD (.scad) models for FDM 3D printing from an idea, text prompt, or sketch/drawing, using a confirmed design brief, a feature tree, and a render-check-refine loop (render errors, watertightness, bed contact, overhangs, thin walls, target size). Use when asked to design, model, create, or generate a printable part, enclosure, bracket, mount, holder, adapter, or other object in OpenSCAD/SCAD from a description, idea, photo of a sketch, or drawing. Not for converting existing STL meshes; use stl-to-scad for that.
compatibility: Requires OpenSCAD 2021.01 or newer on PATH (or the OPENSCAD env var) and uv; network access on first use so uv can fetch the script's Python packages. Reading sketches needs a client with image input.
metadata:
  author: gurbakhshish
  version: "1.0"
---

# Design SCAD

Turn an idea, prompt, or sketch into `<name>.scad`, readable parametric OpenSCAD that prints well on an FDM printer, plus a `<name>.png` preview.

This skill covers new designs only. If the user wants an existing STL reproduced as SCAD, use `stl-to-scad` instead.

## Defaults

Use these unless the user or brief says otherwise:

| Setting | Default |
|---|---|
| Units | mm |
| Orientation | modelled as printed, flat base on z = 0 |
| Printer | FDM, 0.4 mm nozzle, 0.2 mm layers, 220 × 220 × 250 mm bed |
| Minimum wall | 1.2 mm |
| Unsupported overhang | ≤ 45° from vertical |
| Size check tolerance | ±0.1 mm |
| Libraries | OpenSCAD built-ins only; BOSL2 by opt-in (step 4) |
| Refine iterations | 5 before checking in |

Clearances, hole compensation, hardware sizes, and other print rules are in [references/fdm-printability.md](references/fdm-printability.md). Code layout and naming are in [references/scad-style.md](references/scad-style.md). Read both before writing code.

## Script

Paths are relative to this skill's directory. Run with `uv run --script scripts/render_check.py …`. uv installs the dependencies from the script's inline metadata. `--help` lists all options.

`scripts/render_check.py` renders a `.scad` to STL and writes iso/top/front/right PNGs. It reports:

- OpenSCAD warnings, body count, watertightness, bounding box, and volume
- build-plate contact for every body
- overhang regions and thin-wall regions
- the size against `--expect-size`

`-D name=value` overrides a parameter. Exit code: 0 no hard failures, 1 hard failures, 2 render or load error. Overhangs and thin walls are REVIEW items and never fail the check on their own.

## Workflow

### 1. Preflight

1. Confirm that `openscad --version` and `uv --version` both work. If either is missing, stop and tell the user what to install.
2. Pick a short `snake_case` `<name>` from the object (e.g. `cable_clip`). Write outputs to the current directory unless the user gives a path. If `<name>.scad` or `<name>.png` already exists there, ask before overwriting.
3. Create the scratch directory `.design-scad-<name>/` in the output directory. All iterations and renders go there.

### 2. Understand the input

From a **prompt or idea**, extract the object's function, any stated dimensions, the parts or hardware it mates with, and its constraints (load, environment, look, quantity).

From a **sketch or drawing**:

1. View every image. If the client cannot view images, ask the user to describe the views and give the dimensions.
2. Identify each view (top, front, side, section, isometric) and how the views relate.
3. Transcribe every labelled dimension into a table along with its source view. Note the units; assume mm only when nothing says otherwise, and state that assumption.
4. Derive unlabelled dimensions only by scaling from a labelled one in the same view. Mark them "scaled from sketch". Sketches are rarely to scale, so treat these as assumptions the user must confirm.
5. If the sketch has no dimensions at all, ask for at least one reference dimension.
6. List every ambiguous mark, such as a circle that could be a hole, a boss, or a pin, or a line that could be a groove, a step, or an edge. Ask about the ambiguous marks in step 3.

For standard hardware, such as screws, nuts, heat-set inserts, bearings, and magnets, take sizes from fdm-printability.md and record them as "standard". For hardware with no fixed standard size, such as a device or a brand of insert, ask for measured dimensions.

### 3. Design brief gate

Ask only about missing information that changes the geometry, in rounds of 2–5 questions with a recommended default each:

- overall size or key dimensions
- what it fits, holds, or attaches to, and how (screws, snap, press fit, glue)
- functional loads or flex that change wall thickness or orientation
- unusual printer limits (small bed, different nozzle, resin)

Then present the brief:

1. **Purpose** and output name
2. **Key dimensions**: name, value, and source (user, sketch, scaled from sketch, standard, or assumed)
3. **Assumptions and defaults applied**, including clearances
4. **Print orientation** and any expected supports
5. **Feature tree**: base bodies, then added features, then removed features
6. **Parameters**: the Customizer groups and which values the user will want to tweak
7. **Library**: built-ins or BOSL2, and why

Wait for explicit approval before writing code, and revise the brief when asked. If the user tells you to skip the gate, proceed with the stated assumptions and list them again at delivery.

### 4. Library decision

Default to OpenSCAD built-ins, because the file then renders anywhere and works in web Customizers. Propose BOSL2 only when the design needs things that would make built-in code long or fragile: functional printed threads, gears, rounding of complex 3D edges, or sweeps. Include this proposal in the brief whenever you can foresee it. Also offer the built-in alternative, such as a heat-set insert or nut trap in place of a printed thread.

If the user picks BOSL2, probe for it:

```
printf 'include <BOSL2/std.scad>\ncuboid(1);\n' > <scratch>/bosl2-probe.scad
openscad -o <scratch>/bosl2-probe.stl <scratch>/bosl2-probe.scad
```

If the probe fails, do not install BOSL2 yourself. Tell the user to clone `https://github.com/BelfrySCAD/BOSL2` into the "User Library Path" that `openscad --info` reports, or to choose built-ins. BOSL2 is beta software, so record the dependency in the file header.

### 5. Write the candidate

Write `<scratch>/iter-1.scad`, following scad-style.md and fdm-printability.md from the start. Use the brief's dimension names as the parameter names.

### 6. Check

```
uv run --script scripts/render_check.py <scratch>/iter-N.scad --work-dir <scratch> --label iter-N \
    [--expect-size X,Y,Z] [--min-wall 1.2] [--overhang 45]
```

Pass `--expect-size` when the brief fixes the overall envelope.

- **Exit code 2** means a SCAD or render error. Fix it; that attempt does not count as an iteration.
- **Views.** If the client accepts images, look at all four PNGs. Check that every feature in the tree is present, counted correctly (holes, ribs, slots), and in the right place. For sketch input, compare each orthographic view with the matching sketch view.
- **Dimensions.** The script checks only the envelope. For internal features, check the parameters and derived values against the brief, and confirm their positions in the views.
- **Overhang regions.** Resolve each one in one of three ways:
  - accept it as an intentional bridge within the limits in fdm-printability.md
  - redesign it (45° chamfer, teardrop hole, reorientation, split part)
  - record it as needing supports
- **Thin-wall regions.** Thicken the wall, or justify the region as intentional (flexure, snap arm, cosmetic detail) and record it.

### 7. Refine

Fix problems in this order: hard failures, then mismatches with the brief or sketch, then REVIEW items. Save each attempt as the next `iter-N.scad`. If an attempt is worse than the best so far, continue from the best one.

After 5 valid iterations, if hard failures or mismatches with the brief remain, show the best iteration's iso render and list its open issues. Ask whether to **continue refining** or **accept with the listed issues**.

If the user asks for design changes, update the brief. Re-confirm the brief if dimensions or features change materially. Each new round of changes gets up to 5 iterations.

### 8. Clean up and stress-test

1. Refactor the chosen iteration against the checklist in scad-style.md.
2. Re-run the check on the result. The cleanup must not add failures or REVIEW regions.
3. Run the check again with `-D` at the low and high ends of the main parameters' Customizer ranges, using separate `--label`s. Each variant must render with no hard failures. Otherwise, fix the derived values or tighten the ranges and the `assert()`s.

### 9. Deliver

1. Write the final code to `<name>.scad`, and copy the final `<label>_iso.png` to `<name>.png`.
2. Delete the scratch directory.
3. Tell the user:
   - the output paths
   - the size, body count, and watertight status
   - the print orientation and any supports needed
   - how each REVIEW item was handled
   - the parameters most worth tweaking
   - the assumptions made, and any BOSL2 dependency
4. Show the preview image if the client can display it.

## Edge cases

- **Multiple parts** (for example, a box and its lid): keep them in one file with a `part = "all"; // [all, box, lid, assembly]` selector. `all` lays the parts out flat and apart, ready to print. Check `all` and each single part. `assembly` puts the parts in their fitted positions. Render it only as a PNG with plain `openscad -o … -D 'part="assembly"'`, because parts float there by design.
- **Larger than the bed**: tell the user, and propose splitting the part at a flat face with alignment pins or a dovetail. Do not scale the part down.
- **Mating an existing object**: use the user's measured dimensions plus the clearances in fdm-printability.md. For tight fits, offer a quick test print of just the mating feature.
- **Organic or sculpted shapes**: say early that OpenSCAD handles these poorly. Offer an approximation with `hull()`, `rotate_extrude()`, or a computed `polyhedron()`, or suggest a mesh or sculpting tool.
- **Slow renders**: avoid 3D `minkowski()` and high `$fn` on large boolean stacks. Round in 2D with `offset()`, and use `$fa`/`$fs` in place of a large global `$fn`.
