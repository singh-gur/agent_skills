---
name: design-solidcraft
description: Designs new parametric 3D-printable parts in SolidCraft through its MCP server (solidcraft-cli mcp) from an idea, text prompt, or sketch/drawing, using a confirmed design brief, a feature tree, and a build-measure-refine loop (timeline errors, measured vs computed volume and size, bed contact, overhangs, wall thickness, parameter range ends). Delivers a .solidcraft design plus .3mf, .step, and a .png preview. First checks that solidcraft-cli is installed and the MCP server is enabled, and gives setup instructions when not. Use when asked to design, model, create, or generate a printable part, enclosure, bracket, mount, holder, adapter, or other object in SolidCraft. Not for OpenSCAD output; use design-scad for that.
compatibility: Requires SolidCraft's solidcraft-cli (written against 0.18.3) with its MCP server enabled in the agent client and allowed to write to the output folder. Overhang colours need a GPU or software renderer. Reading sketches needs a client with image input.
metadata:
  author: gurbakhshish
  version: "1.0"
---

# Design SolidCraft

Turn an idea, prompt, or sketch into a parametric SolidCraft design that prints well on an FDM printer. Build it through the SolidCraft MCP server and deliver:

- `<name>.solidcraft`: the editable parametric design
- `<name>.3mf`: for the slicer
- `<name>.step`: for other CAD tools
- `<name>.png`: an iso preview

This skill covers new designs only. For OpenSCAD output, use `design-scad` instead.

## Defaults

Use these unless the user or brief says otherwise:

| Setting | Default |
|---|---|
| Units | mm |
| Orientation | modelled as printed, flat base on Z = 0, centred on the origin in XY |
| Printer | FDM, 0.4 mm nozzle, 0.2 mm layers, 220 × 220 × 250 mm bed |
| Minimum wall | 1.2 mm |
| Unsupported overhang | ≤ 45° from vertical |
| Size check tolerance | ±0.1 mm |
| Volume check tolerance | 0.01 % (0.1 % for long shallow arcs) |
| Refine iterations | 5 before checking in |

References, relative to this skill's directory:

- [references/setup.md](references/setup.md): install and MCP setup instructions for the user. Read it only when preflight fails.
- [references/fdm-printability.md](references/fdm-printability.md): clearances, holes, hardware sizes, and print rules. Read it before preparing the brief.
- [references/solidcraft-commands.md](references/solidcraft-commands.md): command shapes, sketch-plane axes, ids, picks, checks, and known traps. Read it before the first build call.

## MCP tools

Clients prefix tool names differently (e.g. `mcp__solidcraft__batch`). This skill uses the bare names: `inspect_design`, `batch`, `execute`, `measure`, `body_topology`, `set_parameter`, `screenshot`, `export`, `save`, `open`, `new_design`, `undo`, `running`, `crash_reports`, `describe_command`, `list_commands`.

- Build with `batch`. It is all-or-nothing and names the failing step.
- Pass absolute paths to every tool that writes a file. The server writes only inside its allowed folders, and the folder must already exist.
- Pass `"source":"model"` to every `screenshot`.
- Never call `list_commands` without a `filter`; the full catalog is over 100 KB.
- The session holds one design. Do not build in parallel, for example from subagents.

## Workflow

### 1. Preflight

1. **MCP server.** Look for the SolidCraft MCP tools among your tools. If your client loads MCP tools on demand, search for them first. If they are present, call `inspect_design {"measure":false,"sketches":false}`. A normal reply means the server is installed and enabled; go to step 3.
2. **Missing or not responding.** Look for the CLI with `solidcraft-cli --version`. If that fails, also try `solidcraft.cli --version` (Snap), `/Applications/SolidCraft.app/Contents/MacOS/solidcraft-cli --version` (macOS), and `& "C:\Program Files\SolidCraft\solidcraft-cli.exe" --version` (Windows PowerShell). Then stop. Give the user the matching sections of setup.md, filled in with the CLI path that worked and the absolute output folder:
   - no CLI found: "Install SolidCraft", then "Enable the MCP server"
   - CLI found: "Enable the MCP server"

   Do not edit the client's configuration unless the user asks you to. Do not build the design another way.
3. **Open work.** If the `inspect_design` reply lists timeline features, the session holds someone's work. Ask before calling `new_design`, which discards unsaved changes. If the server's instructions say `Backend: connected to the SolidCraft app`, you are driving the user's open app, and screenshots with `view` also move their camera.
4. **Name and output.** Pick a short `snake_case` `<name>` from the object (e.g. `cable_clip`). Write outputs to the current directory unless the user gives a path. If any of the four output files already exists there, ask before overwriting.
5. **Scratch and file access.** Create the scratch folder `<out>/design-solidcraft-<name>/` for checkpoints and renders. Don't start its name with a dot: the server refuses hidden folders unless an `--allow-path` covers them. Probe it with `screenshot {"source":"model","width":64,"height":64,"path":"<scratch>/probe.png"}`. If the server refuses the path, its error lists the folders it may use. Offer to write the outputs in one of those instead, or give the user "Allow the output folder" from setup.md and stop.

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
2. **Key dimensions**: parameter name in the form `<feature>_<property>` (e.g. `plate_width`, `mount_hole_d`), value, and source (user, sketch, scaled from sketch, standard, or assumed)
3. **Assumptions and defaults applied**, including clearances
4. **Print orientation** and any expected supports
5. **Feature tree**: base bodies, then added features, then removed features, then fillets and chamfers, each with the feature name it will get
6. **Parameters**: the driving parameters the user should tweak, each with its allowed range, and the derived values that follow them
7. **Expected numbers**: the overall bounding box and volume, computed by hand. Give a bound instead when an exact volume is impractical, for example for lofts or fillets on curved edges.

Wait for explicit approval before building, and revise the brief when asked. If the user tells you to skip the gate, proceed with the stated assumptions and list them again at delivery.

### 4. Build the candidate

1. Start an empty design with `new_design {"name":"<name>"}`.
2. Write the build plan as numbers: each feature's sketch plane, positions as parameter expressions, the world point for every edge or face pick, and the volume, bounding box, and face count expected after each stage.
3. Build in about 3–4 `batch` calls, one per stage, following solidcraft-commands.md:
   1. parameters, base sketch, and base feature
   2. outside fillets, then the shell
   3. added features (bosses, ribs), then holes, cuts, and patterns
   4. remaining fillets and chamfers, such as the rim of a shelled box and bottom-edge chamfers
4. Put each risky step in its own batch, so a failure does not roll back good work. Risky steps include booleans between touching curved faces and commands you have not used yet in this session.
5. After each stage, run `measure {}` and compare it with the stage's expected numbers before continuing. A cut or hole that leaves the volume unchanged has missed, even though it reported success.
6. When the build is complete, run `save {"path":"<scratch>/iter-1.solidcraft"}`.

A failed batch changes nothing. Read `failed.index` and `failed.error`, fix that step, and send the batch again. Failed batches do not count as iterations.

### 5. Check

Run every check on the current iteration:

- **Timeline.** Run `inspect_design {"measure":false,"sketches":false}`. No feature may have an `error`. A `warning` such as `Boolean retry` is acceptable only if the volume matches.
- **Numbers.** Run `measure {}`. Check that the body count is as planned, the volume and bounding box match the brief within tolerance, and every body's bounding box starts at Z ≈ 0.
- **Views.** Take `iso`, `top`, `front`, and `right` screenshots at 480 × 320, each with a `path` in the scratch folder. If the client accepts images, look at them. Check that every feature in the tree is present, counted correctly (holes, ribs, slots), and in the right place. For sketch input, compare each orthographic view with the matching sketch view.
- **Overhangs.** Run `execute inspect.draft {"pull":[0,0,1],"angle":45}`, setting `angle` to the overhang limit. Take a `bottom` screenshot and one from below the part (`camera` pitch about −0.5). Red faces face down and lean further from vertical than the limit. Red faces on Z = 0 are bed contact, and each body needs at least one. Every other red face is an overhang. Resolve each overhang in one of three ways:
  - accept it as an intentional bridge within the limits in fdm-printability.md
  - redesign it (45° chamfer, teardrop hole, reorientation, split part)
  - record it as needing supports

  Turn the analysis off afterwards with `inspect.draft {"clear":true}`. If the screenshot's `renderer` is `cpu`, it shows no analysis colours; use the `body_topology` fallback in solidcraft-commands.md instead.
- **Walls.** Check each wall, each floor, and the material around each hole against the minimum wall, using the parameters and derived values. Where walls meet at angles or near holes, cut a section with `inspect.section` and look at it, or measure the gap between two faces. solidcraft-commands.md covers both. Thicken any thin region, or justify it as intentional (flexure, snap arm, cosmetic detail) and record it.

### 6. Refine

Fix problems in this order: timeline errors and number mismatches, then mismatches with the brief or sketch, then overhang and wall items. Change features in place with `timeline.inspect` and `timeline.edit`, and parameters with `set_parameter`. Undo a bad change with `undo`. Save each checked attempt as the next `<scratch>/iter-N.solidcraft`. If an attempt is worse than the best so far, `open` the best one and continue from it.

After 5 valid iterations, if timeline errors or mismatches with the brief remain, show the best iteration's iso view and list its open issues. Ask whether to **continue refining** or **accept with the listed issues**.

If the user asks for design changes, update the brief. Re-confirm the brief if dimensions or features change materially. Each new round of changes gets up to 5 iterations.

### 7. Clean up and stress-test

1. **Tidy.** Make sure that:
   - every driving dimension is a parameter with its range in its `comment`, and the main ones are marked `favorite`
   - every expression used in more than one place is a named parameter
   - every feature and sketch has a unique name that says what it is
   - every sketch has 0 degrees of freedom: run `inspect_design {"measure":false}` once and check each sketch's DOF
2. **Range ends.** Set each main parameter to the low end of its range, then the high end, with `set_parameter`. For related parameters, use one `batch` of `parameters.change` steps. At each end, check that `errors` is empty, `measure` gives the volume and bounding box you computed for that state, and every body still starts at Z ≈ 0. Otherwise, fix the expressions or tighten the range. Then restore the defaults.
3. Re-run the step 5 checks on the defaults. The cleanup must not add failures, overhangs, or thin walls.

### 8. Deliver

1. With the default parameters, and with no analysis or section showing, write the outputs with absolute paths:
   - `save {"path":"<out>/<name>.solidcraft"}`
   - `export {"path":"<out>/<name>.3mf"}`
   - `export {"path":"<out>/<name>.step"}`
   - `screenshot {"source":"model","view":"iso","width":800,"height":600,"path":"<out>/<name>.png"}`
2. Delete the scratch folder.
3. Tell the user:
   - the output paths
   - the size, body count, and volume
   - the print orientation and any supports needed
   - how each overhang and wall item was handled
   - the parameters most worth tweaking, which are the favourites in SolidCraft's Parameters table
   - the assumptions made
4. Show the preview image if the client can display it.

## Edge cases

- **Multiple parts** (for example, a box and its lid): make one named body per part (`body_name`, or `body.rename`), each in its print orientation, laid out on the bed at least 5 mm apart. Check each body. The parts are not assembled, so check the fits from the clearance parameters. When the user asks for a single part, export it with `export {"path":"…","bodies":["Lid"]}`.
- **Larger than the bed**: tell the user, and propose splitting the part at a flat face with alignment pins or a dovetail. Do not scale the part down.
- **Mating an existing object**: use the user's measured dimensions plus the clearances in fdm-printability.md. For tight fits, offer a quick test print of just the mating feature.
- **Organic or sculpted shapes**: use revolve, loft, sweep, and spline sketches. Expect a volume bound rather than an exact value, and rely more on the views.
- **The server stops answering or crashes**: call `running` before sending a change again, and `crash_reports` to find the cause. Then reopen the last checkpoint with `open`.
