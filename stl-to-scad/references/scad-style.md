# OpenSCAD style

Output must read like a part a person designed: named dimensions, one module per feature, no unexplained numbers.

## File layout

```openscad
// <Part name>: <one line on what it is and its main features>.
// Reverse-engineered from <name>.stl; units mm; coordinates match the STL.

/* [Base plate] */
plate_size = [60, 40];
plate_thickness = 4;
plate_corner_r = 5;

/* [Mounting holes] */
mount_hole_d = 4.2;
mount_hole_pitch = [40, 24];

/* [Hidden] */
$fn = 96;      // matches the source tessellation
eps = 0.01;    // overlap that keeps boolean faces from coinciding

// Derived values
plate_top = plate_thickness;

module rounded_rect(size, r) {
    offset(r = r) offset(delta = -r) square(size, center = true);
}

module base_plate() {
    linear_extrude(plate_thickness) rounded_rect(plate_size, plate_corner_r);
}

module mount_holes() {
    for (x = [-1, 1], y = [-1, 1])
        translate([x * mount_hole_pitch.x / 2, y * mount_hole_pitch.y / 2, -eps])
            cylinder(d = mount_hole_d, h = plate_thickness + 2 * eps);
}

module part() {
    difference() {
        base_plate();
        mount_holes();
    }
}

part();
```

Keep this order: header comment, Customizer parameter groups, the `[Hidden]` group, derived values, 2D helper modules, feature modules, the assembly module, and a single top-level call.

## Rules

- **Parameters.** Every dimension that sets the design is a named top-level variable in a `/* [Group] */` Customizer section. Names are `snake_case` with units implied (mm). Use `_d` for a diameter, `_r` for a radius, and `_pos` or `_pitch` for placements.
- **No magic numbers in modules.** The literals allowed inside modules are `0`, `1`, `-1`, `2` (e.g. `/ 2`), `90`/`180`/`360`, and `eps`.
- **Derived values.** Compute dependent values once, e.g. `boss_top = plate_thickness + boss_height`, and don't repeat the arithmetic inline.
- **One module per feature**, named by function (`mount_holes`, `cable_slot`), not by construction (`cyl2`). The top-level `part()` reads as the feature tree: `difference() { union() { adds } removes }`.
- **Reuse shapes.** 2D helper modules (`rounded_rect`, `slot`) hold shapes used more than once. Don't copy geometry.
- **Patterns** use `for` over a list of positions or a range. Don't write repeated `translate` blocks.
- **Symmetry** uses `mirror()` or `for (s = [-1, 1])`. Model the unique half once.
- **Subtractions** extend `eps` past every face they cut. Additions that touch overlap by `eps`. This avoids coincident faces and non-manifold output.
- **Tessellation.** One global `$fn`, or `$fa`/`$fs`, in `[Hidden]`. Put a per-call `$fn` only where the source demands a different count, with a comment.
- **Comments** give intent or source evidence ("no hole at +x+y in source", "draft 2°"), not a narration of the code.
- **Formatting.** 4-space indent. `name = value` spacing in arguments. One statement per line. Braces on the opening line.
- **Placement.** Keep the STL frame. If the part is rotated, the only non-identity transform outside `part()` is one top-level `rotate()`/`multmatrix()`, with a comment.
- **Mesh-derived regions** (from `extract_region.py`, only with user approval) live at the end of the file under `// ---- Mesh-derived regions (user-approved) ----`. Splice them in `part()` as `union() { difference() { body(); name_region_box(); } name_region(); }`.
- **Compatibility.** Target OpenSCAD 2021.01: no `object()`, no function literals in Customizer values, no features newer than 2021.

## Cleanup checklist

Apply these in SKILL.md step 8, then re-run compare:

- [ ] Every literal dimension lives in a named parameter or derived value
- [ ] No duplicated geometry; patterns use loops and symmetry uses mirror
- [ ] Module names describe features; `part()` reads as the feature tree
- [ ] No dead code, commented-out experiments, or unused parameters and modules
- [ ] Values are snapped to design intent where compare still passes
- [ ] `eps` is used consistently on every cut and join
- [ ] The file renders with no OpenSCAD warnings
