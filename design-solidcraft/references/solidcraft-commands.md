# SolidCraft commands for part design

Command shapes, plane axes, ids, picks, checks, and traps for building a part over the SolidCraft MCP server. For a command not listed here, call `describe_command {"id":"<command>"}` or `list_commands {"filter":"<distinctive word>"}`.

Condensed from SolidCraft's `docs/mcp.md` and its `solidcraft-modeling` skill (MIT OR Apache-2.0), and checked against solidcraft-cli 0.18.3.

## Contents

- Units and expressions
- Reply cost
- Sketch planes
- Ids
- Dimensions
- Features
- Picks
- Parameters and edits
- Checks
- Files
- Errors

## Units and expressions

- Lengths are in mm; a unit suffix converts (`"1 in"`). Angles in expressions take units (`"30 deg"`). Bare angles in command fields are degrees, but the `screenshot` camera uses radians.
- Any numeric field can be an expression over parameters, such as `"plate_width/2 - wall - 6"`. A plain number never follows a parameter.
- Expressions support `+ - * / ^ %`, `sin cos tan asin acos atan atan2 sqrt abs min max floor ceil round mod trunc exp ln log log10 pow sign hypot`, `pi`, and units. They have no `if` and no comparisons.

## Reply cost

| Call | Size |
|---|---|
| `list_commands {}` | over 100 KB: always pass `filter` |
| `body_topology` | 5–45 KB, growing with the part |
| `inspect_design {}` | about 12 KB, growing with the sketches |
| `inspect_design {"measure":false,"sketches":false}` | about 4 KB: parameters, timeline errors, bodies |
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

- Each sketch numbers its own ids from 1: curves `l1`, `c1`, `a1`; points `p1`, `l1.start`, `l1.end`, `c1.center`; the sketch origin is `"origin"`. Creators return `created: {points, curves, constraints, dimensions}`. Ids are predictable, so later steps in the same batch can use them.
- `sketch.rectangle.center` makes `l1`–`l6`, including two construction diagonals, and `p1`–`p5`, where `p5` is the centre. `sketch.fillet {point}` fails on its corners; use `{"a":"l1","b":"l4","radius":…}` or `solid.fillet`.
- `sketch.circle.center` makes `c1` and `c1.center`, and no `p` point.
- Slots (`sketch.slot.overall`, `sketch.slot.center_to_center`) make `l1, a1, l2, a2` and `p1`–`p4`.
- Dimensions share the `k` counter with constraints. A constraint about an axis, such as symmetry with `line:"y"`, adds a construction line and takes the next `l` id. Read `created` before you count further.
- A new point placed exactly on an existing point or on the origin becomes coincident with it.

## Dimensions

```json
{"command":"sketch.dimension","params":{"entities":["origin","c1.center"],"type":"horizontal","value":"plate_width/2 - 6"}}
{"command":"sketch.dimension","params":{"entities":["c1"],"type":"diameter","value":"mount_hole_d"}}
{"command":"sketch.dimension","params":{"entities":["l1"],"value":"plate_width"}}
```

- Distances are unsigned. Draw the geometry on the correct side first, and the dimension keeps it there.
- A dimension from a line to a circle measures to the circle's edge. Use `c1.center` for the distance to the centre.
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
- **Hex (nut trap):** use `sketch.draw.dimensioned` with `sketch.polygon.circumscribed {center, radius, sides:6, angle:0}` and the dimension `{"radius":"nut_af/2 + 0.15"}`. Then add `sketch.constraint.polygon {"lines":["l1","l2","l3","l4","l5","l6"]}` and `sketch.constraint.horizontal_vertical {"line":"l1"}`. This reaches DOF 0. `radius` is measured to the edge midpoints, i.e. half the across-flats size.
- The solver refuses over-constraining (`that conflicts with the sketch`). Run `sketch.solve` before `sketch.finish` and aim for DOF 0, so parameter changes cannot move the geometry.

## Features

| Command | Minimal params | Notes |
|---|---|---|
| `solid.extrude` | `distance` | `profiles` defaults to every region, so two concentric circles give a solid disc. Pick regions with `[{"point":[x,y]}]` or `[{"curves":[ids]}]`. Other options: `operation` (new/join/cut/intersect), `direction` (positive/negative/symmetric), `through_all:true`, `taper`. |
| `solid.revolve` | `axis` (sketch line id, `x`/`y`, or `X`/`Y`/`Z`) | `angle` defaults to 360 deg. |
| `solid.box` | `length`, `width`, `height` | Takes `center` or `corner` (expressions allowed), `operation`, `body_name`, and `targets`. The quickest way to block out a part. |
| `solid.cylinder` | `radius` or `diameter`, `height` | `base` is the bottom centre (expressions allowed); `axis` defaults to Z. Always pass `operation`. |
| `solid.fillet` / `solid.chamfer` | `edges:[[x,y,z]]`, `radius` / `distance` | One pick takes the whole tangent chain. |
| `solid.shell` | `faces:[[x,y,z]]`, `thickness` | Give a point on each face to remove, or the face's name from `body_topology`. |
| `solid.hole` | `position:[x,y,z]` on a face, or `sketch` (+ `points`); `diameter`, or `clearance:"M3"` with `fit` close/normal/loose (ISO 273) | `depth` defaults to through all. `type` is simple, drilled, counterbore (`cb_diameter`, `cb_depth`), or countersink (`cs_diameter`, `cs_angle`). |
| `solid.pattern.rectangular` | `features`, `dir1`, `count1`, `spacing1` (+ `dir2`, `count2`, `spacing2`) | Spacings and counts take expressions. |
| `solid.pattern.circular` | `features`, `axis` (`"Z"` or `{origin, dir}`), `count` | `angle` defaults to 360 deg. |
| `solid.mirror` | `features` or `bodies`, `plane` (`XY`/`XZ`/`YZ` or `{origin, normal}`) | `combine:true` joins an overlapping mirror to the original. |

- Give every feature and sketch a unique name (`"name":"MountHole"`), because name lookups take the first match.
- **Order:** fillet the outside edges before `solid.shell`, so the shell follows them. Round the rim of the removed face after the shell. Put every join before the cuts that must stay open, because a later join fills them.
- A mirror or pattern feature cannot be mirrored or patterned again; pattern the original feature.
- A `solid.box` or `solid.cylinder` cut that touches curved faces can fail with `planar faces only`. Use a sketch profile and an extrude cut instead.
- Start cutters about 1 mm outside the faces they pierce, and sink joins about 1 mm into the body, so that faces don't coincide.

## Picks

- Edge and face picks are world points in plain numbers. They snap to the **nearest** edge or face with no distance limit and no error. Compute exact midpoints from the plan (the vertical corner edge of a centred box is `[w/2, d/2, h/2]`), and confirm that the face count changed.
- A pick is resolved once. After that, it follows its edge when parameters change.
- Faces can also be picked by name (`faces:["F1:+z"]`), taken from `body_topology`.

## Parameters and edits

- Add a parameter: `parameters.add {"name":"plate_width","expression":"40 mm","comment":"20–80 mm","favorite":true}`. Add a count: `{"name":"rib_count","expression":"4","unit":""}`.
- Change one parameter with `set_parameter {"name":"plate_width","value":"60 mm"}`; the reply lists `errors`. Change several with one `batch` of `parameters.change {"name":…,"expression":…}` steps.
- Pattern counts must stay at 1 or more. A fractional count rounds silently, so use `round(n)` wherever a count also positions something.
- A sketch dimension driven to 0 loses its side and can flip or fail on the next change. Choose the origin and ranges so that no dimension reaches 0.
- To change a feature, read its definition with `timeline.inspect {"feature":"Plate"}`, then change fields with `timeline.edit {"feature":"Plate","set":{"extent":{"distance":"30"}}}`.

## Checks

- **Volume tolerance:** measured and computed volumes agree to about 0.001–0.01 %, or about 0.1 % for long shallow arcs. Compare the logical `faces` count, not `kernel.faces`.
- **Overhangs:** `execute inspect.draft {"pull":[0,0,1],"angle":<overhang limit>}` colours faces in later screenshots. Red faces face down and lean further from vertical than the limit; yellow faces are within it. Clear it with `{"clear":true}`. The `cpu` renderer shows no colours.
- **Overhang fallback:** run `body_topology {"body":"<name>"}`. A planar face is an overhang when its `plane_normal` Z is below −sin(limit) and its `centroid` Z is above 0.01. A face with `cylinder` data, a horizontal `axis`, and a `radius` above 2.5 mm is a horizontal hole or boss to review.
- **Sections:** `execute inspect.section {"plane":"XZ","at":<y>}` removes the side its normal points to (+Y for XZ). Look into the cut from that side, for example with `screenshot {"source":"model","camera":{"target":[x,y,z],"yaw":3.1416,"pitch":0.3,"distance":<1.5 × region size>},"grid":false}`. Clear it with `{"clear":true}`.
- **Gap between two faces:** `measure {"items":[{"type":"face","body":"Body1","index":1,"point":[…]},{"type":"face","body":"Body1","index":5,"point":[…]}]}` returns `min`, the closest distance. Take each face's `index` and `point` from `body_topology`.
- **Camera:** `{target, yaw, pitch, distance}` are in mm and radians. `yaw:0, pitch:0` looks from −Y, and `yaw:π` looks from +Y. Positive pitch looks down from above; negative pitch looks up from below.
- **Warnings:** a `Boolean retry` feature warning means the kernel nudged faces that coincided. It is harmless only when the volume still matches.

## Files

- `save {"path"}` writes a `.solidcraft` design, and `open {"path"}` reopens one.
- `export {"path"}` picks the format from the extension (`.3mf`, `.step`, `.stl`). Add `bodies:["Lid"]` to export only those bodies.
- `screenshot {"path"}` also writes the PNG to a file.
- Paths must be absolute, inside the server's allowed folders, and in a folder that already exists. A refusal names the allowed folders.

## Errors

| Error text | Fix |
|---|---|
| `... no sketch is being edited` | Run `sketch.create` or `sketch.edit {sketch}` first. |
| `unknown sketch entity 'p1'` | Use the ids from `created`; a circle's centre is `c1.center`. |
| `the corner must join exactly two lines` | It is a `rectangle.center` corner; use `sketch.fillet {a, b, radius}`. |
| `unsupported dimension role for this creator` | Check the roles under Dimensions. |
| `<Feature> cannot be patterned or mirrored yet` | Pattern the original feature. |
| `an edge is a point [x,y,z], {point} or {body, index}` | A pick contains an expression; use plain numbers. |
| `boolean Cut: ... planar faces only` | Use a sketch profile and an extrude cut. |
| `outside the folders this agent may use (...)` | See preflight step 5 in SKILL.md. |
| `its folder does not exist` | Create the folder first. |
