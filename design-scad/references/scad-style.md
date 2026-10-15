# OpenSCAD style

The output must read like a part a person designed: intuitive `<feature>_<property>` variable names, functional Customizer groups, named reference planes, and a `part()` module that reads as a pure feature tree.

## File layout

```openscad
// Wall peg: screw-mounted plate with a square peg for hanging tools.
// Designed for FDM; units mm; modelled in print orientation (back plate on z = 0).

/* [Main Dimensions] */
plate_width = 30;               // [20:1:80]
plate_length = 50;              // [40:1:100]
plate_thickness = 4;            // [2:0.5:8]
plate_corner_r = 4;             // [0:0.5:10]

/* [Peg] */
peg_width = 6;                  // [3:0.5:12]
peg_height = 25;                // [10:1:60]
peg_offset_y = -12;             // [-14:1:-5]

/* [Mounting] */
mount_screw_clearance_d = 4.5;  // M4 clearance, ISO 273 medium
mount_hole_offset_y = 12;       // [5:1:14]

/* [Print & Fit] */
hole_comp = 0.2;                // [0:0.05:0.5] vertical holes print undersized

/* [Hidden] */
$fa = 2;
$fs = 0.4;
eps = 0.01;                     // overlap that keeps boolean faces from coinciding

// ---- Derived dimensions & reference planes ----
plate_top_z = plate_thickness;
mount_hole_d = mount_screw_clearance_d + hole_comp;

// ---- Guards ----
assert(plate_thickness >= 1.2, "plate_thickness below minimum FDM wall");
assert(plate_corner_r < min(plate_width, plate_length) / 2, "plate_corner_r too large for plate");
assert(peg_width <= plate_width - 2 * plate_corner_r, "peg_width wider than flat face of plate");
assert(abs(peg_offset_y) + peg_width / 2 <= plate_length / 2, "peg overhangs plate edge");
assert(abs(mount_hole_offset_y) + mount_hole_d / 2 < plate_length / 2, "mount hole cuts plate edge");
assert(abs(peg_offset_y - mount_hole_offset_y) >= (peg_width + mount_hole_d) / 2, "mount hole under peg");

// ---- Helpers (local origin) ----
module rounded_rect(width, length, r) {
    offset(r = r) offset(delta = -r) square([width, length], center = true);
}

module through_hole(d, height) {
    translate([0, 0, -eps])
        cylinder(d = d, h = height + 2 * eps);
}

// ---- Feature modules (part coordinates) ----
module base_plate() {
    linear_extrude(plate_thickness)
        rounded_rect(plate_width, plate_length, plate_corner_r);
}

module tool_peg() {
    translate([0, peg_offset_y, plate_top_z - eps])
        linear_extrude(peg_height + eps)
            square([peg_width, peg_width], center = true);
}

module mount_hole() {
    translate([0, mount_hole_offset_y, 0])
        through_hole(mount_hole_d, plate_thickness);
}

// ---- Assembly ----
module part() {
    difference() {
        union() {
            base_plate();
            tool_peg();
        }
        mount_hole();
    }
}

part();
```

Keep this order:

1. Header comment
2. Customizer parameter groups (`[Main Dimensions]`, feature groups, `[Print & Fit]`)
3. The `[Hidden]` group
4. Derived dimensions & reference planes
5. `assert()` guards
6. Helper modules (built at local origin)
7. Feature modules (placed in part coordinates)
8. The `part()` assembly module
9. A single top-level call

## Variable naming scheme

Use `<feature>_<property>` in `snake_case`. Every variable name must make both **what feature** it belongs to and **what physical property** it measures obvious at a glance.

- **Prefix with the feature.** Write `plate_corner_r`, `boss_outer_d`, and `clip_wall_thickness`—never bare `corner_r`, `outer_d`, or `thick`. Only truly global settings (`wall_thickness`, `hole_comp`, `fit_clearance`, `eps`) omit a feature prefix.
- **Full words for dimensions, standard short suffixes only for `_d`, `_r`, `_comp`, and `_x`/`_y`/`_z`.** Axis words refer to part coordinates in print orientation, so a peg standing up from the plate has a `_height`, not a `_length`:

| Property kind | Convention | Examples | Avoid |
|---|---|---|---|
| Linear size (X, Y, Z) | `_width` (X), `_length` or `_depth` (Y), `_height` (Z) | `box_width`, `base_length`, `lip_height` | `box_w`, `base_l`, `box_size = [60, 40]` |
| Wall or floor thickness | `_thickness` | `wall_thickness`, `floor_thickness`, `plate_thickness` | `wall_t`, `thk`, `t` |
| Diameter & radius | `_d`, `_r` | `mount_hole_d`, `boss_outer_d`, `plate_corner_r` | `hole_dia`, `rad`, `r1` |
| Position from origin/center | `_offset_x`, `_offset_y`, `_offset_z` | `peg_offset_y`, `port_offset_x` | `peg_pos_y`, `px`, `y1` |
| Distance from an edge | `_inset` or `_inset_x` / `_inset_y` | `hole_inset`, `screw_inset_x` | `margin`, `edge_dist` |
| Center-to-center pitch | `_spacing` or `_spacing_x` / `_spacing_y` | `mount_hole_spacing_x`, `rib_spacing` | `pitch = [40, 24]`, `step` |
| Quantity / angle / toggle | `_count`, `_angle`, `has_<feature>` | `rib_count`, `chamfer_angle`, `has_drain_hole` | `n_ribs`, `num`, `ang` |
| Clearances & fit (gap between mating parts) | `_clearance` | `lid_fit_clearance`, `mount_screw_clearance_d` | `tol`, `slop` |
| Printer compensation (offsets print error) | `_comp` | `hole_comp`, `elephant_foot_comp` | `fudge`, `adj` |
| Reference planes (derived) | `<feature>_top_z`, `<feature>_bottom_z`, `<feature>_center_y` | `base_top_z`, `cavity_floor_z`, `boss_top_z` | repeating `base_thickness + ...` inline |

- **Separate scalars over vectors.** Define multi-axis parameters as separate scalar variables (`plate_width = 30; plate_length = 50;`), never vector arrays (`plate_size = [30, 50];`). Scalar names document which axis is which and get individual range sliders in the Customizer.

## Parameter grouping & Customizer scope

Organize Customizer sections by **functional domain** from overall envelope down to tolerances:

1. `/* [Main Dimensions] */` (or `/* [Enclosure Size] */` / `/* [Base Plate] */`) — overall width, length/depth, height, primary wall/base thickness, and outer corner radius.
2. `/* [<Feature Name>] */` (1–3 groups such as `/* [Mounting] */`, `/* [Cable Slot] */`, `/* [Retention Clip] */`) — keep all tweakable parameters for a functional subsystem together (size, count, spacing, mating hardware diameter).
3. `/* [Print & Fit] */` — clearances and printer compensation (`hole_comp`, `fit_clearance`, `chamfer_size`).
4. `/* [Hidden] */` — tessellation (`$fa = 2; $fs = 0.4;`) and boolean overlap (`eps = 0.01;`).

Follow these grouping rules:

- **No single-variable micro-groups.** Every visible Customizer group except `[Print & Fit]` must hold at least 2 related parameters. If a feature has only one tweakable dimension (e.g. `cable_slot_width`), place it in `[Main Dimensions]` or merge it with an adjacent feature group (e.g. `/* [Slots & Cutouts] */`).
- **Curate Customizer sliders.** Only expose dimensions a user would practically tweak (overall size, wall thickness, hardware size, hole count/spacing, clearances). Keep fixed geometric proportions (e.g. `boss_outer_d = mount_hole_d * 2.2`), internal offsets, and Z reference planes in the `Derived dimensions & reference planes` section so the Customizer stays uncluttered.
- **Safe ranges.** Give main scalar parameters Customizer ranges (`// [min:step:max]`) or option lists (`// [a, b]`) that keep the part printable.

## Structure, readability & maintainability

- **Header.** State what the part is, how it is oriented on the print bed, and any library or font dependency (`// Requires BOSL2 (tested with <version or commit>)`).
- **Guards.** Use `assert()` right after the derived values (so guards can check them) to catch parameter combinations that break geometry or printability: walls below minimum thickness, corner radii exceeding half the face width, hole spacings that collide with walls, or features wider than their parent body.
- **Derived dimensions & reference planes.** Compute dependent dimensions and Z/XY reference coordinates once (`plate_top_z = plate_thickness;`, `cavity_floor_z = floor_thickness;`, `inner_width = box_width - 2 * wall_thickness;`). Group them with short comments when there are more than a few. Never repeat coordinate arithmetic across multiple modules.
- **No magic numbers in modules.** The only numeric literals allowed inside modules are `0`, `1`, `-1`, `2` (for halving/doubling, e.g. `/ 2` or `2 * eps`), `90`, `180`, `360`, and `eps`.
- **Three-tier module architecture:**
  1. **Helpers (`rounded_rect`, `slot_2d`, `teardrop_hole`, `through_hole`, `counterbore_hole`)** take explicit parameters, build reusable shapes at their **local origin**, and encapsulate `-eps` / `+ 2 * eps` cut extensions so callers do not repeat `eps` math.
  2. **Feature modules (`base_plate`, `mounting_ears`, `mount_holes`, `cable_slot`)** represent one physical feature of the part, read top-level and derived variables, and position themselves in **part coordinates** using named reference planes.
  3. **Assembly (`part()`)** is a pure feature tree (`difference() { union() { adds } removes }`) that calls feature modules by name with **zero inline `translate()`, `rotate()`, or arithmetic**.
- **Shallow boolean nesting.** Keep `part()` to one outer `difference()` with one `union()` for positive bodies and a flat list of negative feature modules. If a positive feature needs its own local cut (or a cut needs a local keep-out), encapsulate that inside the feature module rather than nesting `difference()` blocks inside `part()`.
- **Center and mirror to avoid offset math.** Center symmetric 2D profiles at the XY origin (`center = true` on `square()`, then `linear_extrude()`), and place symmetric features with `for (side_x = [-1, 1])` or `mirror()`. Use descriptive loop variables (`side_x`, `side_y`, `rib_index`) instead of cryptic single letters when nesting loops.
- **Manifold overlaps (`eps`).** Every subtraction must extend `eps` past every face it cuts; every abutting addition must overlap its parent face by `eps` (e.g. `translate([0, 0, plate_top_z - eps]) linear_extrude(boss_height + eps)`).
- **Placement & multi-part files.** Model in print orientation with the base on `z = 0` and symmetric parts centered on the XY origin. Don't place a final transform outside `part()` unless the part needs a different print orientation; if it does, add a comment. For multi-part designs, use `part = "all"; // [all, box, lid, assembly]` at the top of `[Main Dimensions]` (see SKILL.md edge cases): give each part its own pure-feature-tree module (`box()`, `lid()`), and do the layout and assembly `translate()`/`rotate()` in the top-level `part` selector block, not inside those modules.
- **Tessellation.** Set `$fa = 2; $fs = 0.4;` in `[Hidden]`. Use a per-call `$fn` only where a fixed polygon count is intentional (e.g. `$fn = 6` for a hex nut trap), with a comment.
- **Comments.** Explain design intent or standards (`// M4 clearance, ISO 273 medium`, `// 45 deg chamfer avoids support`), never narrate syntax.
- **Formatting & compatibility.** 4-space indent, `name = value` spacing in arguments, one statement per line, braces on the opening line. Target OpenSCAD 2021.01 (no `object()`, no function literals in Customizer parameters).

## Cleanup checklist

Apply these in SKILL.md step 8, then re-run the check:

- [ ] Every variable follows `<feature>_<property>` with full-word dimension names and separate scalars (no `[x, y]` parameter arrays or bare names like `corner_r`)
- [ ] Customizer groups are organized by functional domain with no single-variable micro-groups (except `[Print & Fit]`), and internal/fixed geometry lives in `Derived dimensions & reference planes`
- [ ] Main parameters have Customizer ranges, and `assert()` guards catch invalid combinations
- [ ] All coordinate stacks and clearances are computed once as named derived values (`<feature>_top_z`, `<feature>_d`)
- [ ] Helpers live at local origin (handling `eps` internally), feature modules handle part placement, and `part()` is a pure feature tree with no inline `translate()`/`rotate()` calls
- [ ] Patterns use `for` loops with clear variable names, and symmetry uses `mirror()` or `[-1, 1]` loops
- [ ] No dead code, commented-out experiments, magic numbers, or unused variables/modules
- [ ] The file renders with no OpenSCAD warnings at default and range-end parameters
