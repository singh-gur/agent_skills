# SolidCraft commands for part design

Command shapes, plane axes, ids, picks, checks, and traps for building a part over the SolidCraft MCP server. For a command not listed here, call `describe_command {"id":"<command>"}` or `list_commands {"filter":"<distinctive word>"}`.

Condensed from SolidCraft's `docs/mcp.md` and its `solidcraft-modeling`, `solidcraft-editing`, and `solidcraft-checking` skills (MIT OR Apache-2.0). Checked against solidcraft-cli 0.18.4, including the worked example at the end. After a SolidCraft upgrade, compare this file with `skills/` in https://github.com/tangency-labs/solidcraft and re-run the worked example.

## Contents

- Units and expressions
- Reply cost
- Sketch planes
- Ids
- Dimensions and constraints
- Features
- Picks
- Parameters
- Checkpoints and changes
- Checks
- Files and recovery
- Errors
- Worked example

## Units and expressions

- Lengths are in mm, and a unit suffix converts (`"1 in"`). Angles in expressions take units (`"30 deg"`). Bare angles in command fields are degrees, but the `screenshot` camera uses radians.
- Any numeric field can be an expression over parameters, such as `"plate_width/2 - wall_thickness - 6"`. A plain number never follows a parameter.
- Expressions support `+ - * / ^ %`, `sin cos tan asin acos atan atan2 sqrt abs min max floor ceil round mod trunc exp ln log log10 pow sign hypot` (`log` is base 10), `pi`, and units. They have no `if` and no comparisons; build steps from `floor`, `mod`, `min`, `max`, and `sign`.

## Reply cost

| Call | Size |
|---|---|
| `list_commands {}` | over 100 KB: always pass `filter` |
| `body_topology` | 5–45 KB, growing with the part |
| `inspect_design {}` | about 12 KB, growing with the sketches |
| `inspect_design {"measure":false,"sketches":false}` | about 4 KB: parameters, timeline errors, bodies |
| `sketch.inspect` | about 5 KB per small sketch; run it on its own, never inside a big batch |
| `parameters.list {"filter":"feature"}` | about 3 KB: every feature input |
| `measure {}` | about 1 KB: volume, bbox, centre of mass, and face/edge/vertex counts per body |
| `sketch.solve` | under 100 B: DOF, status, and profile count of the active sketch |

Pass `"verbose": false` to `batch` and `execute` in large designs.

## Sketch planes

| `plane` | sketch x | sketch y | normal (+distance) |
|---|---|---|---|
| `"XY"` | +X | +Y | +Z |
| `"XZ"` | +X | **−Z** | +Y |
| `"YZ"` | +Y | +Z | +X |
| `{origin, x_dir, y_dir}` | x_dir | y_dir | x_dir × y_dir |

- `"offset":"<expr>"` on `sketch.create` moves the plane along its normal and follows parameters. For the top face of a part of height `h`, use `{"plane":"XY","offset":"h"}`.
- For the front wall (−Y) of a part centred on the origin, sketch on `{"plane":"XZ","offset":"-d/2"}`. Draw a feature at height z at sketch y = **−z**. A cut with a positive distance goes into the wall (+Y).

## Ids

- Each sketch numbers its own ids from 1: curves `l1`, `c1`, `a1`; points `p1`, `l1.start`, `l1.end`, `c1.center`, `a1.center`. The sketch origin is `"origin"`. Creators return `created: {points, curves, constraints, dimensions}`. Ids are predictable, so later steps in the same batch can use them; don't split a batch just to read ids back.
- `sketch.rectangle.center` makes `l1`–`l6`, including two construction diagonals, and `p1`–`p5`, where `p5` is the centre. Its sides and corners also come back as `sides {bottom,right,top,left}` and `corners {bottom_left,…}`. `sketch.fillet {point}` fails on its corners; use `{"a":"l1","b":"l4","radius":…}` or `solid.fillet`.
- `sketch.circle.center` makes `c1` and `c1.center`, and no `p` point.
- Slots (`sketch.slot.overall`, `sketch.slot.center_to_center`) make `l1, a1, l2, a2`, points `p1`–`p4`, `a1.center`, and `a2.center`. The `length` of `slot.overall` is the overall length, so the arc centres sit at ±(length/2 − width/2). `sketch.slot.center_point` makes no centre point.
- Dimensions share the `k` counter with constraints. A constraint about an axis, such as symmetry with `line:"y"`, adds a construction line and takes the next `l` id. Read `created` before you count further.
- A new point placed exactly on an existing point or on the origin becomes coincident with it.

## Dimensions and constraints

```json
{"command":"sketch.dimension","params":{"entities":["origin","c1.center"],"type":"horizontal","value":"plate_width/2 - 6"}}
{"command":"sketch.dimension","params":{"entities":["c1"],"type":"diameter","value":"mount_hole_d"}}
{"command":"sketch.dimension","params":{"entities":["l1"],"value":"plate_width"}}
```

- Distances are unsigned. Draw the geometry on the correct side first, and the dimension keeps it there.
- A dimension from a line to a circle measures to the circle's edge. Use `c1.center` for the distance to the centre.
- **Never dimension a distance to 0.** The solver refuses it (`that dimension is already determined by other constraints`), or a distance driven to 0 by a parameter loses its side and fails or flips on the next change. Use a constraint for points on an axis, and choose the origin and ranges so no distance expression reaches 0.
- `sketch.draw.dimensioned` creates a shape and its dimensions in one step. The roles by creator are:
  - `line` (2 points): `length`, `angle`
  - `rectangle.*`: `width`, `height`
  - `circle.*`: `radius` or `diameter`
  - `arc.center_point`: `radius`, `sweep`
  - `slot.*`: `length`, `width`
  - `polygon.*`: `radius`

```json
{"command":"sketch.draw.dimensioned","params":{"command":"sketch.rectangle.center","params":{"center":[0,0],"corner":[20,15]},"dimensions":{"width":"plate_width","height":"plate_length"}}}
```

- `sketch.line {"points":[[0,0],["W/2",0],…],"closed":true}` accepts expression coordinates that follow parameters.
- **Slot to DOF 0:** after `length` and `width`, a slot keeps 3 DOF. For a slot centred on the origin along X, add `sketch.constraint.symmetry {"a":"a1.center","b":"a2.center","point":"origin"}` and `sketch.constraint.horizontal_vertical {"points":["a1.center","a2.center"],"mode":"horizontal"}`. Elsewhere, dimension the arc centres from `origin` with non-zero values until `sketch.solve` shows DOF 0.
- **Hex (nut trap):** use `sketch.draw.dimensioned` with `sketch.polygon.circumscribed {center, radius, sides:6, angle:0}` and the dimension `{"radius":"nut_af/2 + 0.15"}`. Then add `sketch.constraint.polygon {"lines":["l1","l2","l3","l4","l5","l6"]}`; without it the corners can alternate in and out. Add `sketch.constraint.horizontal_vertical {"line":"l1"}`. This reaches DOF 0. `radius` is measured to the edge midpoints, i.e. half the across-flats size, and `angle:0` puts the flats facing ±x.
- **Rectangle symmetry:** opposite sides of a rectangle run in opposite directions, so symmetry on two sides conflicts with the rectangle. Make two corner points symmetric instead.
- The solver refuses over-constraining (`that conflicts with the sketch`). Run `sketch.solve` before `sketch.finish` and aim for DOF 0, so parameter changes cannot move the geometry.

## Features

| Command | Minimal params | Notes |
|---|---|---|
| `solid.extrude` | `distance` | `profiles` defaults to every region, so two concentric circles give a solid disc. Pick regions with `[{"point":[x,y]}]` or `[{"curves":[ids]}]`. Other options: `operation` (new/join/cut/intersect), `direction` (positive/negative/symmetric), `through_all:true`, `taper` (positive widens along the extrude direction). |
| `solid.revolve` | `axis` (sketch line id, `x`/`y`, or `X`/`Y`/`Z`) | `angle` defaults to 360 deg. |
| `solid.box` | `length`, `width`, `height` | Takes `center` or `corner` (expressions allowed), `operation`, `body_name`, and `targets` (a cut reaches only the listed bodies). The quickest way to block out a part. |
| `solid.cylinder` | `radius` or `diameter`, `height` | `base` is the bottom centre (expressions allowed); `axis` defaults to Z. Always pass `operation`. |
| `solid.fillet` / `solid.chamfer` | `edges:[[x,y,z]]`, `radius` / `distance` | One pick takes the whole tangent chain: the bottom loop of a rounded plate needs 1 point, not 8. `radius` and `distance` take expressions. |
| `solid.shell` | `faces:[[x,y,z]]`, `thickness` | Give a point on each face to remove, or the face's name from `body_topology`. |
| `solid.hole` | `position:[x,y,z]` on a face, or `sketch` (+ `points`); `diameter`, or `clearance:"M3"` with `fit` close/normal/loose (ISO 273) | `depth` defaults to through all. `type` is simple, drilled, counterbore (`cb_diameter`, `cb_depth`), or countersink (`cs_diameter`, `cs_angle`, both required even with `clearance`). Sizes take expressions. |
| `solid.pattern.rectangular` | `features`, `dir1`, `count1`, `spacing1` (+ `dir2`, `count2`, `spacing2`) | Spacings and counts take expressions. |
| `solid.pattern.circular` | `features`, `axis` (`"Z"` or `{origin, dir}`), `count` | `angle` defaults to 360 deg. A full pattern keeps the COM on its axis, so check its radius in a top view. |
| `solid.mirror` | `features` or `bodies`, `plane` (`XY`/`XZ`/`YZ` or `{origin, normal}`) | `features` copies only the listed features, so a later cut is left out unless listed; `bodies` copies the finished body. The mirror is a new body with the first free default name (read it from `created_bodies`; rename with `body.rename`). `combine:true` joins an overlapping mirror to the original. |

- Give every feature, sketch, and body a unique name (`"name":"MountHole"`), because name lookups take the first match. A repeated `body_name` is silently renamed (`Body1`), so `targets` then reach only the first body.
- **Order:** fillet the outside edges before `solid.shell`, so the shell follows them. Round the rim of the removed face after the shell. Put every join before the cuts that must stay open, because a later join fills them. A pattern of a join or cut repeats that join or cut.
- A mirror or pattern feature cannot be mirrored or patterned again; pattern the original feature.
- A `solid.box` or `solid.cylinder` cut that touches curved faces can fail with `planar faces only`. Use a sketch profile and an extrude cut instead.
- Start cutters about 1 mm outside the faces they pierce, and sink joins about 1 mm into the body, so that faces don't coincide. Build a boss with a hole as one ring profile (two concentric circles, extrude the ring), which avoids boolean warnings.

## Picks

- Edge and face picks are world points in plain numbers. They snap to the **nearest** edge or face with no distance limit and no error. Compute exact midpoints from the plan (the vertical corner edge of a centred box is `[w/2, d/2, h/2]`), and confirm that the face count changed.
- A pick is resolved once. After that, it follows its edge when parameters change, so a pick never needs an expression.
- Faces can also be picked by name (`faces:["F1:+z"]`), taken from `body_topology`.

## Parameters

- Add a parameter: `parameters.add {"name":"plate_width","expression":"40 mm","comment":"20-80 mm","favorite":true}`. Add a count: `{"name":"rib_count","expression":"4","unit":"","comment":"whole number, 1-8"}`.
- Reorder with `parameters.move {"name":…,"after":…}` (or `before`). Change a comment with `parameters.comment`, and favourites with `parameters.favorite`.
- Change one parameter with `set_parameter {"name":"plate_width","value":"60 mm"}`; the reply lists `errors`. Change several at once with `parameters.change {"changes":{"plate_width":"60 mm","plate_length":"40 mm"}}`, which checks them together and rebuilds once.
- Pattern counts must stay at 1 or more. A fractional count rounds silently while every other expression uses the exact value, so use `round(n)` wherever a count also positions something.

## Checkpoints and changes

- `execute edit.checkpoint` returns `{checkpoint: id}`; `edit.restore_checkpoint {"checkpoint":id}` goes back to it exactly, undo history included. A failed `batch` rolls itself back; separate `execute` calls do not.
- To change a feature, read its definition with `timeline.inspect {"feature":"Plate"}`, then change fields with `timeline.edit {"feature":"Plate","set":{"extent":{"distance":"30"}}}`.
- `parameters.list {"filter":"feature"}` lists every feature input (`dN`, with its feature and input name) in one call. Use it instead of inspecting features one by one.
- Before deleting a feature, run `timeline.dependents {"feature":…}`: it lists what is deleted with it and what would fail.
- To insert a feature earlier, `timeline.roll_to {"position":N}` (a position is safer than a name), add it, then `timeline.roll_to {}`. Every later feature recomputes and may now fail, so check the timeline.

## Checks

- **Tolerance:** measured and computed volumes agree to about 0.001–0.01 %, or about 0.1 % for long shallow arcs. Centre of mass and bounding box agree to about 5e-5 of the part size. Compare the logical `faces` count, not `kernel.faces`.
- **Positions:** `measure` gives no feature positions. On an asymmetric part, check the centre of mass against the plan. On a symmetric part the COM stays on the symmetry planes, so compare distances in a top view against a known size. A sketch that flipped to the other side keeps the volume and moves the COM.
- **Overhangs:** `execute inspect.draft {"pull":[0,0,1],"angle":<overhang limit>}` colours faces in later screenshots. Red faces face down and lean further from vertical than the limit; yellow faces are within it. Clear it with `{"clear":true}`. The `cpu` renderer shows no colours.
- **Overhang fallback:** run `body_topology {"body":"<name>"}`. A planar face is an overhang when its `plane_normal` Z is below −sin(limit) and its `centroid` Z is above 0.01. A face with `cylinder` data, a horizontal `axis`, and a `radius` above 2.5 mm is a horizontal hole or boss to review.
- **Sections:** `execute inspect.section {"plane":"XZ","at":<y>}` removes the side its normal points to (+Y for XZ). Look into the cut from that side, for example with `screenshot {"source":"model","camera":{"target":[x,y,z],"yaw":3.1416,"pitch":0.3,"distance":<1.5 × region size>},"grid":false}`. Clear it with `{"clear":true}`.
- **Gap between two faces:** `measure {"items":[{"type":"face","body":"Body1","index":1,"point":[…]},{"type":"face","body":"Body1","index":5,"point":[…]}]}` returns `min`, the closest distance. Take each face's `index` and `point` from `body_topology`.
- **Camera:** `{target, yaw, pitch, distance}` are in mm and radians. `yaw:0, pitch:0` looks from −Y, and `yaw:π` looks from +Y. Positive pitch looks down from above; negative pitch looks up from below.
- **Warnings:** a `Boolean retry` feature warning means the kernel nudged faces that coincided. It is harmless only when the volume still matches; otherwise the geometry may be wrong with no error.

## Files and recovery

- `save {"path"}` writes a `.solidcraft` design, and `open {"path"}` reopens one.
- `export {"path"}` picks the format from the extension (`.3mf`, `.step`, `.stl`). Add `bodies:["Lid"]` to export only those bodies.
- `screenshot {"path"}` also writes the PNG to a file.
- Paths must be absolute, inside the server's allowed folders, and in a folder that already exists. A refusal names the allowed folders.
- **Crash:** call `running`, then `crash_reports` (and `crash_reports {id}` for the command that crashed). Never resend the crashing command unchanged. In the app, `execute doc.recovery_list` and `doc.recover {"id":…}` reopen the autosave; otherwise `open` the last saved build.

## Errors

| Error text | Fix |
|---|---|
| `... no sketch is being edited` | Run `sketch.create` or `sketch.edit {sketch}` first. |
| `unknown sketch entity 'p1'` | Use the ids from `created`; a circle's centre is `c1.center`. |
| `the corner must join exactly two lines` | It is a `rectangle.center` corner; use `sketch.fillet {a, b, radius}`. |
| `that dimension is already determined by other constraints` | Often a distance of 0, or a value snapping already fixed. Use a constraint, or drop the dimension. |
| `that conflicts with the sketch` | Over-constrained; for example, symmetry already makes two circles equal. |
| `unsupported dimension role for this creator` | Check the roles under Dimensions and constraints. |
| `` `cs_diameter` must be a number or an expression `` | Countersinks need `cs_diameter` and `cs_angle`, even with `clearance`. |
| `<Feature> cannot be patterned or mirrored yet` | Pattern the original feature. |
| `an edge is a point [x,y,z], {point} or {body, index}` | A pick contains an expression; use plain numbers. |
| `boolean Cut: ... planar faces only` | Use a sketch profile and an extrude cut. |
| `outside the folders this agent may use (...)` | See preflight step 5 in SKILL.md. |
| `its folder does not exist` | Create the folder first. |

## Worked example

A mounting plate with rounded corners, a chamfered bottom edge against elephant's foot, and 4 counterbored M3 holes, in one `batch`. Checked with solidcraft-cli 0.18.4.

```json
{"commands":[
 {"command":"parameters.add","params":{"name":"plate_width","expression":"80 mm","comment":"40-160 mm","favorite":true}},
 {"command":"parameters.add","params":{"name":"plate_length","expression":"50 mm","comment":"30-100 mm","favorite":true}},
 {"command":"parameters.add","params":{"name":"plate_thickness","expression":"6 mm","comment":"4-10 mm"}},
 {"command":"parameters.add","params":{"name":"plate_corner_r","expression":"5 mm","comment":"2-10 mm"}},
 {"command":"parameters.add","params":{"name":"mount_hole_inset","expression":"8 mm","comment":"6-15 mm, edge to hole centre"}},
 {"command":"parameters.add","params":{"name":"mount_hole_d","expression":"3.4 mm","comment":"M3 clearance"}},
 {"command":"parameters.add","params":{"name":"mount_cb_d","expression":"6.5 mm","comment":"M3 socket head + 1 mm"}},
 {"command":"parameters.add","params":{"name":"mount_cb_depth","expression":"3.3 mm","comment":"head height + 0.3 mm, at most plate_thickness - 1.2"}},
 {"command":"parameters.add","params":{"name":"plate_bottom_chamfer","expression":"0.5 mm","comment":"0.3-1 mm, offsets elephant's foot"}},
 {"command":"sketch.create","params":{"plane":"XY","name":"PlateSketch"}},
 {"command":"sketch.draw.dimensioned","params":{"command":"sketch.rectangle.center","params":{"center":[0,0],"corner":[40,25]},"dimensions":{"width":"plate_width","height":"plate_length"}}},
 {"command":"sketch.finish","params":{}},
 {"command":"solid.extrude","params":{"distance":"plate_thickness","name":"Plate"}},
 {"command":"solid.fillet","params":{"edges":[[40,25,3],[-40,25,3],[40,-25,3],[-40,-25,3]],"radius":"plate_corner_r","name":"PlateCorners"}},
 {"command":"solid.chamfer","params":{"edges":[[0,-25,0]],"distance":"plate_bottom_chamfer","name":"PlateBottomChamfer"}},
 {"command":"sketch.create","params":{"plane":"XY","offset":"plate_thickness","name":"MountHoleSketch"}},
 {"command":"sketch.point","params":{"point":[32,17]}},
 {"command":"sketch.dimension","params":{"entities":["origin","p1"],"type":"horizontal","value":"plate_width/2 - mount_hole_inset"}},
 {"command":"sketch.dimension","params":{"entities":["origin","p1"],"type":"vertical","value":"plate_length/2 - mount_hole_inset"}},
 {"command":"sketch.finish","params":{}},
 {"command":"solid.hole","params":{"sketch":"MountHoleSketch","diameter":"mount_hole_d","type":"counterbore","cb_diameter":"mount_cb_d","cb_depth":"mount_cb_depth","name":"MountHole"}},
 {"command":"solid.pattern.rectangular","params":{"features":["MountHole"],"dir1":[-1,0,0],"count1":2,"spacing1":"plate_width - 2*mount_hole_inset","dir2":[0,-1,0],"count2":2,"spacing2":"plate_length - 2*mount_hole_inset","name":"MountHoles"}}
]}
```

Expected, with L = 80, W = 50, T = 6, r = 5, c = 0.5:

- Plate: `L*W*T - 4*r²*(1 - π/4)*T` = 23871.2 mm³
- Bottom chamfer: `c²/2 * (2*(L - 2r) + 2*(W - 2r) + 2π*(r - c/3))` = 31.3 mm³ removed
- Each hole: `π*1.7²*(T - 3.3) + π*3.25²*3.3` = 134.0 mm³ removed
- Total 23303.9 mm³, 30 faces, bbox 80 × 50 × 6 from Z = 0, COM on the Z axis
- After `set_parameter plate_width=120 mm`: 35293.9 mm³, with the holes still in the corners and the chamfer pick still on the bottom loop
