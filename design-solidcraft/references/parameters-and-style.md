# Parameters and style

Rules for naming, ranging, and ordering parameters, and for making the part look good. Read this before preparing the brief.

## Contents

- Naming
- Ranges and comments
- Order and favourites
- Derived values
- Aesthetics

## Naming

Name every user parameter `<feature>_<property>` in `snake_case`. The name must say at a glance which feature it belongs to and which physical property it measures.

- **Prefix with the feature.** Write `plate_corner_r`, `boss_outer_d`, and `clip_wall_thickness`, never bare `corner_r`, `outer_d`, or `thick`. Only truly global settings (`wall_thickness`, `hole_comp`, `fit_clearance`) leave out the prefix.
- **Use full words for sizes.** Short suffixes are allowed only for `_d`, `_r`, `_comp`, and `_x` / `_y` / `_z`. Axis words refer to the print orientation, so a peg standing up from a plate has a `_height`, not a `_length`.

| Property | Convention | Examples | Avoid |
|---|---|---|---|
| Size along X, Y, Z | `_width` (X), `_length` or `_depth` (Y), `_height` (Z) | `box_width`, `base_length`, `lip_height` | `box_w`, `base_l` |
| Wall, floor, plate thickness | `_thickness` | `wall_thickness`, `floor_thickness`, `plate_thickness` | `wall_t`, `thk`, `t` |
| Diameter, radius | `_d`, `_r` | `mount_hole_d`, `boss_outer_d`, `plate_corner_r` | `hole_dia`, `rad`, `r1` |
| Position from the origin | `_offset_x`, `_offset_y`, `_offset_z` | `peg_offset_y`, `port_offset_x` | `peg_pos_y`, `px` |
| Distance from an edge | `_inset`, `_inset_x`, `_inset_y` | `mount_hole_inset`, `screw_inset_x` | `margin`, `edge_dist` |
| Centre-to-centre pitch | `_spacing`, `_spacing_x`, `_spacing_y` | `mount_hole_spacing_x`, `rib_spacing` | `pitch`, `step` |
| Count, angle | `_count`, `_angle` | `rib_count`, `chamfer_angle` | `n_ribs`, `num`, `ang` |
| Edge treatment | `_fillet_r`, `_chamfer` | `edge_fillet_r`, `plate_bottom_chamfer` | `r`, `ch` |
| Gap between mating parts | `_clearance` | `lid_fit_clearance` | `tol`, `slop` |
| Printer compensation | `_comp` | `hole_comp`, `elephant_foot_comp` | `fudge`, `adj` |
| Reference plane (derived) | `<feature>_top_z`, `<feature>_bottom_z`, `<feature>_center_y` | `base_top_z`, `cavity_floor_z` | repeating `base_thickness + …` inline |

SolidCraft-specific rules:

- Use one parameter per axis (`plate_width`, `plate_length`), never one value that packs several.
- Don't use names that SolidCraft already uses. Sketch dimensions and feature inputs are named `d1`, `d2`, …, and expressions reserve function names and constants such as `sin`, `log`, `round`, and `pi`.
- Give lengths with a unit (`"expression":"40 mm"`). Give counts and ratios `"unit":""`.
- Expressions have no `if` and no comparisons, so a feature can't be switched on or off with a parameter. Don't invent toggle parameters.

## Ranges and comments

SolidCraft enforces no range, so the comment is the contract the user reads in the Parameters table.

- Start every driving parameter's comment with its range, then its purpose if that isn't obvious: `"40-160 mm"`, `"whole number, 1-12"`, `"0.3-1 mm, offsets elephant's foot"`.
- Choose each range so the part stays valid and printable across all of it:
  - walls and floors stay at or above the minimum wall
  - holes and cuts stay inside material with at least one minimum wall around them
  - fillets stay below half of the face they round
  - counts stay at 1 or more
  - no sketch dimension reaches 0 (see "Dimensions and constraints" in solidcraft-commands.md)
- Compute the edge cases while you write the brief. A range you never checked is a guess, and a full verification walks both ends of it.

## Order and favourites

SolidCraft has no parameter groups. The order of the list is the grouping, so add parameters in this order, and fix the order later with `parameters.move {"name":…,"after":…}`:

1. **Overall envelope:** overall width, length, height, main wall thickness, outer corner radius.
2. **Feature blocks:** one block per functional feature (mounting, cable slot, lid), with all its parameters together and sharing its prefix. Don't make a block for a single parameter; put it in the envelope or in a neighbouring block.
3. **Fit and print:** clearances, `hole_comp`, edge treatment (`edge_fillet_r`, `bottom_chamfer`).
4. **Derived values:** last, each with the comment `derived`.

Mark the 3-6 parameters a user would most likely change as `favorite`. These are usually the overall size, the main hardware size, a count, and the fit clearance. Favourites are the curated view; everything else stays in the full list.

## Derived values

- Make an expression a named derived parameter when more than one sketch or feature uses it, or when it names a reference plane (`cavity_floor_z = floor_thickness`, `boss_top_z = floor_thickness + boss_height`).
- Derive sizes from the measured or chosen inputs, so that a count parameter changes how many features there are, not how big they are. For example, `rib_spacing = (box_width - 2*wall_thickness) / (rib_count + 1)`.
- Never repeat coordinate arithmetic across sketches; name it once.

## Aesthetics

Make the part look deliberately designed, not just functional. When goals conflict, put function first, printability second, and looks third. Never give up a fit, wall, clearance, or support-free print for appearance, but make every choice that costs nothing look good.

- **Proportions:** use a few related dimensions (shared margins, equal wall and rim widths) rather than arbitrary ones. Avoid bulky solid blocks: ribs and tapers look lighter than thick walls, and they are stiffer.
- **One dominant form:** keep secondary features (bosses, tabs, ports) smaller than the main body, aligned to its edges or axes, and matched in style.
- **Edges:** use one consistent fillet radius (`edge_fillet_r`) on top and vertical edges, and a 45° chamfer (`bottom_chamfer`) on bottom edges, because a fillet there is an overhang. Leave no sharp outside corners unless the look calls for them.
- **Alignment:** centre features on shared axes and space patterns evenly. Keep the part symmetric unless function says otherwise.
- **Clean visible faces:** recess fasteners with counterbores or countersinks, and put text and fine details on top faces. Keep the face that will be seen free of clutter.
- **Parametric looks:** the look follows parameters too. Fillet and chamfer sizes are named parameters with ranges, like any other size.
