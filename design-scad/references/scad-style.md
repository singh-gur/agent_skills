# OpenSCAD style

The output must read like a part a person designed. Every dimension is named, there is one module per feature, and the parameters stay safe to tweak in the Customizer.

## File layout

```openscad
// Wall peg: screw-mounted plate with a square peg for hanging tools.
// Designed for FDM; units mm; modelled in print orientation (back plate on z = 0).

/* [Plate] */
plate_size = [30, 50];          // [20:1:80]
plate_thickness = 4;            // [2:0.5:8]
corner_r = 4;                   // [0:0.5:10]

/* [Peg] */
peg_size = 6;                   // [3:0.5:12]
peg_length = 25;                // [10:1:60]
peg_pos_y = -12;                // [-20:1:20]

/* [Screw] */
screw_pos_y = 15;               // [-20:1:20]

/* [Fit] */
screw_clear_d = 4.5;            // M4 clearance, ISO 273 medium
hole_comp = 0.2;                // vertical holes print undersized

/* [Hidden] */
$fa = 2;
$fs = 0.4;
eps = 0.01;                     // overlap that keeps boolean faces from coinciding

assert(plate_thickness >= 1.2, "plate_thickness below minimum FDM wall");
assert(corner_r < min(plate_size) / 2, "corner_r too large for plate_size");

// Derived values
hole_d = screw_clear_d + hole_comp;
plate_top = plate_thickness;

module rounded_rect(size, r) {
    offset(r = r) offset(delta = -r) square(size, center = true);
}

module plate() {
    linear_extrude(plate_thickness) rounded_rect(plate_size, corner_r);
}

module screw_hole() {
    translate([0, 0, -eps]) cylinder(d = hole_d, h = plate_thickness + 2 * eps);
}

module peg() {
    translate([-peg_size / 2, peg_pos_y - peg_size / 2, plate_top - eps])
        cube([peg_size, peg_size, peg_length + eps]);
}

module part() {
    difference() {
        union() {
            plate();
            peg();
        }
        translate([0, screw_pos_y, 0]) screw_hole();
    }
}

part();
```

Keep this order:

1. Header comment
2. Customizer parameter groups, with `[Fit]` for clearances
3. The `[Hidden]` group
4. `assert()`s
5. Derived values
6. 2D helper modules
7. Feature modules
8. The assembly module
9. A single top-level call

## Rules

- **Header.** Say what the part is and how it is printed. Also record any library dependency and its version, e.g. `// Requires BOSL2 (tested with <version or commit>)`.
- **Parameters.** Every dimension that sets the design is a named top-level variable in a `/* [Group] */` Customizer section.
  - Names are `snake_case` in mm. Use `_d` for a diameter, `_r` for a radius, and `_pos` or `_pitch` for placements.
  - Give the main parameters Customizer ranges (`// [min:step:max]`) or option lists (`// [a, b]`) that keep the part printable.
- **Guards.** Use `assert()` on combinations that would break the geometry or printability: walls below the minimum, radii larger than the faces they round, hardware that doesn't fit its boss.
- **No magic numbers in modules.** The only literals allowed inside modules are `0`, `1`, `-1`, `2` (e.g. `/ 2`), `90`, `180`, `360`, and `eps`.
- **Derived values.** Compute dependent values once, e.g. `boss_top = plate_thickness + boss_height`. Don't repeat the arithmetic inline.
- **One module per feature.** Name each module by its function (`mount_holes`, `cable_slot`), not by its construction (`cyl2`). The top-level `part()` reads as the feature tree: `difference() { union() { adds } removes }`.
- **Reuse shapes.** 2D helper modules (`rounded_rect`, `slot`, `teardrop`) hold shapes used more than once. Don't copy geometry.
- **Patterns** use `for` over a list of positions or a range. **Symmetry** uses `mirror()` or `for (s = [-1, 1])`.
- **Subtractions** extend `eps` past every face they cut. Additions that touch overlap by `eps`. This keeps the output manifold.
- **Placement.** Model in print orientation, with the base on z = 0.
  - Centre symmetric parts on the XY origin.
  - Lay out multiple printable parts with a `part` selector (see SKILL.md edge cases).
  - Don't place a final transform outside `part()` unless the design genuinely needs a different orientation for printing. If it does, add a comment.
- **Tessellation.** Use `$fa`/`$fs` in `[Hidden]` (`$fa = 2; $fs = 0.4` suits most prints). Put a per-call `$fn` only where a fixed count matters, such as `$fn = 6` for a hex nut, and add a comment.
- **Comments** give intent or a source ("M3 clearance", "teardrop: no supports"), not a narration of the code.
- **Formatting.** 4-space indent, `name = value` spacing in arguments, one statement per line, braces on the opening line.
- **Compatibility.** Target OpenSCAD 2021.01. Avoid features newer than 2021 and function literals in Customizer values.

## Cleanup checklist

Apply these in SKILL.md step 8, then re-run the check:

- [ ] Every literal dimension lives in a named parameter or derived value
- [ ] Main parameters have Customizer ranges; `assert()`s guard invalid combinations
- [ ] No duplicated geometry; patterns use loops, and symmetry uses mirror
- [ ] Module names describe features; `part()` reads as the feature tree
- [ ] No dead code, commented-out experiments, or unused parameters or modules
- [ ] `eps` is used consistently on every cut and join
- [ ] The file renders with no OpenSCAD warnings at the default and range-end parameters
