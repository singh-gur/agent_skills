---
name: design-solidcraft
description: Designs new parametric 3D-printable parts in SolidCraft through its MCP server (solidcraft-cli mcp) from an idea, text prompt, or sketch/drawing. Aims for visually appealing parts without giving up function or printability, with consistently named and ranged parameters. Works from a confirmed design brief, plans each build stage as numbers, checks every stage against its predicted volume, size, and centre of mass, then runs print checks (bed contact, overhangs, walls) and parameter-range checks at a user-chosen verification level (none, light, or full). Delivers a .solidcraft design plus .3mf, .step, and a .png preview. First checks that solidcraft-cli is installed and the MCP server is enabled, and gives setup instructions when not. Use when asked to design, model, create, or generate a printable part, enclosure, bracket, mount, holder, adapter, or other object in SolidCraft. Not for editing an existing SolidCraft design or for OpenSCAD output (use design-scad).
compatibility: Requires SolidCraft's solidcraft-cli (checked against 0.18.4) with its MCP server enabled in the agent client and allowed to write to the output folder. Overhang colours need a GPU or software renderer. Reading sketches needs a client with image input.
metadata:
  author: gurbakhshish
  version: "2.0"
---

# Design SolidCraft

Turn an idea, prompt, or sketch into a parametric SolidCraft part that prints well on an FDM printer and looks deliberately designed. Build it through the SolidCraft MCP server and deliver:

- `<name>.solidcraft`: the editable parametric design
- `<name>.3mf`: for the slicer
- `<name>.step`: for other CAD tools
- `<name>.png`: an iso preview

This skill covers new designs only. To change an existing `.solidcraft` file, use SolidCraft's own `solidcraft-editing` skill if it is installed. For OpenSCAD output, use `design-scad`.

## Principles

1. **Function first, then printability, then looks.** Never give up a fit, wall, clearance, or support-free print for appearance, but make every choice that costs nothing look good.
2. **Numbers before calls.** Plan every stage with its expected volume, bounding box, face count, and centre of mass before building it. A command that reports success may still have done nothing, such as a cut that missed. Only a `measure` that matches the plan counts.
3. **Every size and position is a named parameter**, with a range in its comment, and no sketch is left with free DOF.
4. **Model as printed.** The part sits on the bed as modelled.

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
| Verification level | light, chosen in preflight |

References, relative to this skill's directory:

- [references/setup.md](references/setup.md): install and MCP setup instructions for the user. Read it only when preflight fails.
- [references/fdm-printability.md](references/fdm-printability.md): clearances, holes, hardware sizes, and print rules. Read it before preparing the brief.
- [references/parameters-and-style.md](references/parameters-and-style.md): parameter naming, ranges, order, favourites, and aesthetics. Read it before preparing the brief.
- [references/solidcraft-commands.md](references/solidcraft-commands.md): command shapes, sketch-plane axes, ids, picks, checks, traps, and a worked example. Read it before planning the build.

## Verification levels

The level sets which checks run and how many fix rounds happen before checking in with the user:

| Check | None | Light | Full |
|---|---|---|---|
| Stage check: `measure` against the plan after each stage (step 5) | yes | yes | yes |
| Timeline (step 6) | yes | yes | yes |
| Views (step 6) | none | `iso`, `top` | `iso`, `top`, `front`, `right` |
| Bed contact and overhangs (step 6) | skip | yes | yes |
| Walls (step 6) | skip | from parameters | from parameters, plus sections |
| Fix rounds before checking in (step 6) | none | 2 | 5 |
| Range walk (step 7) | skip | skip | yes |

At every level, fix timeline errors and stage mismatches as they appear, and tidy the parameters (step 7).

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
5. **Scratch and file access.** Create the scratch folder `<out>/design-solidcraft-<name>/` for saves and renders. Don't start its name with a dot: the server refuses hidden folders unless an `--allow-path` covers them. Probe it with `screenshot {"source":"model","width":64,"height":64,"path":"<scratch>/probe.png"}`. If the server refuses the path, its error lists the folders it may use. Offer to write the outputs in one of those instead, or give the user "Allow the output folder" from setup.md and stop.
6. **Verification level.** Unless the request already names one, ask the user to choose **none**, **light** (recommended), or **full**, summarising each from [Verification levels](#verification-levels) in one line. Use light if the user leaves the choice to you. The user may change the level at any point.

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
- the style, only when the part will be on display and nothing in the request hints at one

Then present the brief:

1. **Purpose** and output name
2. **Key dimensions**: each value with its parameter name and its source (user, sketch, scaled from sketch, standard, or assumed)
3. **Assumptions and defaults applied**, including clearances
4. **Print orientation** and any expected supports
5. **Look**: the edge treatment, proportions, and visible-face choices from the Aesthetics section of parameters-and-style.md, plus any style the user asked for
6. **Feature tree**: base bodies, then added features, then removed features, then fillets and chamfers, each with the feature name it will get
7. **Parameters**: in their list order (envelope, feature blocks, fit and print, derived), each driving one with its range and the favourites marked, following parameters-and-style.md
8. **Expected numbers**: the overall bounding box and volume, computed by hand. Give a bound instead when an exact volume is impractical, for example for lofts or fillets on curved edges.

Wait for explicit approval before building, and revise the brief when asked. If the user tells you to skip the gate, proceed with the stated assumptions and list them again at delivery.

### 4. Plan as numbers

Before the first build call, write the plan for each stage:

- the commands in order, each sketch's plane and offset, and every position as a parameter expression
- the world point for every edge or face pick, computed from the geometry, in plain numbers
- the expected body count, volume, bounding box, logical face count, and centre of mass after the stage. On a symmetric part the COM stays on the symmetry planes; on an asymmetric part, compute it.

Use about 3–4 stages:

1. parameters in their list order, the base sketch, and the base feature
2. outside fillets, then the shell
3. added features (bosses, ribs), then holes, cuts, and patterns, with every join before the cuts that must stay open
4. remaining edge treatment, such as the rim of a shelled box and the bottom chamfers

Centre the part on the origin in XY, so mirrors and patterns can use the origin planes. Choose the origin and the ranges so that no sketch dimension reaches 0. Put each risky step in a stage of its own, so a failure doesn't roll back good work. Risky steps include booleans between touching curved faces and commands you have not used yet in this session.

### 5. Build stage by stage

1. Start an empty design with `new_design {"name":"<name>"}`.
2. For each stage:
   1. Take `execute edit.checkpoint` in its own call and keep the id.
   2. Send the stage as one `batch`. A failed batch changes nothing: read `failed.index` and `failed.error`, fix that step, and send it again.
   3. Run `measure {}` and compare it with the stage's expected numbers. A cut or hole that leaves the volume unchanged has missed. A COM away from its planned position means a feature is misplaced or a sketch flipped.
   4. On a mismatch, find the cause, `edit.restore_checkpoint` to the stage's start, and send the corrected stage. Do not build the next stage on an unexplained mismatch.
3. After the last stage, `save {"path":"<scratch>/build.solidcraft"}` so a crash cannot lose the build.

### 6. Check the part

Run the checks your verification level includes. At level none, run only the timeline check, then go to step 7.

- **Timeline.** Run `inspect_design {"measure":false,"sketches":false}`. No feature may have an `error`. A `warning` such as `Boolean retry` is acceptable only if the volume matches.
- **Numbers and bed contact.** Run `measure {}`. Check the body count, the volume, and the bounding box against the brief, and that every body's bounding box starts at Z ≈ 0.
- **Views.** Take your level's views at 480 × 320, each with a `path` in the scratch folder, and look at them if the client accepts images.
  - Every feature in the tree is present, counted correctly (holes, ribs, slots), and in the right place. The iso view hides features inside walls, so check those in the top view. On a symmetric layout, compare distances in the top view against a known size.
  - The look matches the brief: consistent edges, aligned features, clean visible faces, and proportions that read as one designed object.
  - For sketch input, compare each orthographic view with the matching sketch view.
- **Overhangs.** Run `execute inspect.draft {"pull":[0,0,1],"angle":45}`, setting `angle` to the overhang limit. Take a `bottom` screenshot and one from below the part (`camera` pitch about −0.5). Red faces face down and lean further from vertical than the limit. Red faces on Z = 0 are bed contact, and each body needs at least one. Every other red face is an overhang. Resolve each overhang in one of three ways:
  - accept it as an intentional bridge within the limits in fdm-printability.md
  - redesign it (45° chamfer, teardrop hole, reorientation, split part)
  - record it as needing supports

  Turn the analysis off afterwards with `inspect.draft {"clear":true}`. If the screenshot's `renderer` is `cpu`, it shows no analysis colours; use the `body_topology` fallback in solidcraft-commands.md instead.
- **Walls.** Check each wall, each floor, and the material around each hole against the minimum wall, using the parameters and derived values. At full, also cut a section with `inspect.section`, or measure the gap between two faces, where walls meet at angles or near holes. Thicken any thin region, or justify it as intentional (flexure, snap arm, cosmetic detail) and record it.

**Fixing.** Fix problems in this order: timeline errors and number mismatches, then mismatches with the brief or sketch, then overhang and wall items, then look items.

- Take a checkpoint, and change the design in place: `set_parameter`, `parameters.change`, or `timeline.inspect` with `timeline.edit`.
- Send related fixes in one batch, predict their total effect on the numbers, and `measure` once. If the result is worse, restore the checkpoint and apply the fixes one at a time.
- A fix round is one set of fixes followed by the level's checks.

After your level's fix-round limit, if timeline errors or mismatches with the brief remain, show the iso view and list the open issues. Ask whether to **continue fixing** or **accept with the listed issues**.

If the user asks for design changes, update the brief. Re-confirm the brief if dimensions or features change materially. Each new round of changes gets your level's fix-round limit again.

### 7. Parameters

1. **Tidy** (every level). Make sure that:
   - every driving size and position is a parameter named, ranged, and ordered as parameters-and-style.md says, with 3–6 favourites
   - every expression used in more than one place is a named derived parameter
   - every feature, sketch, and body has a unique name that says what it is
   - every sketch has 0 DOF: run `inspect_design {"measure":false}` once and check each sketch's DOF
2. **Range walk** (full only). Walk each main parameter to the low end of its range, then the high end, then back to the default, one change after another. A distance that reaches 0 fails only on the change after it. For related parameters, change them together with `parameters.change {"changes":{…}}`. At each end, check that:
   - `errors` is empty
   - `measure` gives the volume, bounding box, and COM you computed for that state
   - every body still starts at Z ≈ 0

   Otherwise, fix the expressions or tighten the range.
3. If tidying or the range walk changed the design, re-run your level's step 6 checks on the defaults.

### 8. Deliver

1. With the default parameters, and with no analysis or section showing, write the outputs with absolute paths:
   - `save {"path":"<out>/<name>.solidcraft"}`
   - `export {"path":"<out>/<name>.3mf"}`
   - `export {"path":"<out>/<name>.step"}`
   - `screenshot {"source":"model","view":"iso","width":800,"height":600,"path":"<out>/<name>.png"}`
2. Delete the scratch folder.
3. Tell the user:
   - the output paths
   - the verification level used and, for none or light, the checks that were skipped
   - the size, body count, and volume
   - the print orientation and any supports needed
   - how each overhang and wall item was handled, and the look applied
   - the parameters most worth tweaking, which are the favourites in SolidCraft's Parameters table
   - the assumptions made
4. Show the preview image if the client can display it.

## Edge cases

- **Multiple parts** (for example, a box and its lid): make one uniquely named body per part (`body_name`, or `body.rename`), each in its print orientation, laid out on the bed at least 5 mm apart. Check each body. The parts are not assembled, so check the fits from the clearance parameters. When the user asks for a single part, export it with `export {"path":"…","bodies":["Lid"]}`.
- **Larger than the bed**: tell the user, and propose splitting the part at a flat face with alignment pins or a dovetail. Do not scale the part down.
- **Mating an existing object**: use the user's measured dimensions plus the clearances in fdm-printability.md. For tight fits, offer a quick test print of just the mating feature.
- **Organic or sculpted shapes**: use revolve, loft, sweep, and spline sketches. Expect a volume bound rather than an exact value, and rely more on the views.
- **The server stops answering or crashes**: follow "Files and recovery" in solidcraft-commands.md, then reopen `<scratch>/build.solidcraft` or rebuild from the last good stage.

## Red flags

| Thought | Do instead |
|---|---|
| "It reported ok, so it worked" | Only a `measure` that matches the plan counts. |
| "I'll fix this mismatch in the next stage" | Restore the stage's checkpoint and rebuild the stage correctly. |
| "List all commands first" | Use solidcraft-commands.md, or `list_commands {"filter":"<word>"}`. |
| "Check positions with body_topology" | Compare the COM with the plan, and use a top view for symmetric layouts. |
| "Pick all 8 rim edges" | One pick takes the whole tangent chain. |
| "Round the bottom edge, it looks nicer" | A bottom fillet is an overhang; use a 45° chamfer. |
| "This number won't change, hard-code it" | If it sizes or places anything, make it a named parameter. |
| "Dimension this point to 0 from the origin" | Use a constraint, such as symmetry or horizontal/vertical alignment. |
