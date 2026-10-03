# FDM printability

These are starting values for a 0.4 mm nozzle, 0.2 mm layers, and PLA or PETG. Printers vary, so turn every fit-critical value into a `[Fit]` parameter rather than hard-coding it.

## Contents

- Walls and layers
- Overhangs, bridges, and supports
- Holes
- Clearances
- Hardware
- Strength and orientation
- Text and small details

## Walls and layers

| Feature | Value |
|---|---|
| Minimum wall | 0.8 mm (2 perimeters); default 1.2 mm; 2 mm or more for load-bearing parts |
| Wall thickness | a multiple of about 0.4 mm, so walls print as whole perimeters |
| Floors and roofs | at least 0.8–1.0 mm (4–5 layers) |
| Vertical dimensions | multiples of the layer height where it matters (snap ledges, lid lips) |
| Bottom edges | a 0.4–0.6 mm × 45° chamfer offsets elephant's foot and avoids an overhanging fillet |

## Overhangs, bridges, and supports

- **Overhangs** up to 45° from vertical print without supports. Anything flatter needs a chamfer, a bridge, a reorientation, or supports.
- **Bottom edges** of raised features get 45° chamfers. Fillets belong on top and vertical edges, because a fillet's lower part is a growing overhang.
- **Bridges** (flat ceilings supported at both ends) print well up to about 10 mm. Up to 20–30 mm is acceptable with some sag. Beyond that, redesign the feature or plan supports.
- **Supports.** Flag any feature that still needs them and say where they go. Prefer designs with none.

## Holes

- **Vertical holes** (axis along z) print about 0.1–0.2 mm undersized. Add `hole_comp` (default 0.2 mm) to the diameter of fit-critical holes.
- **Horizontal holes** (axis in XY) up to about 5 mm print acceptably as-is. For larger ones, use a teardrop profile (a circle hulled with a 45° point at the top) or a flat-topped bridge, and note that profile in a comment.
- **Polygonal holes.** OpenSCAD inscribes polygons inside the circle, so a hole with a low facet count comes out smaller than its nominal diameter. Keep `$fs` small, or use `circle(d = d / cos(180 / n), $fn = n)` for an exact fit with `n` facets.

## Clearances

These are gaps per side (radial for round parts):

| Fit | Gap |
|---|---|
| Press fit | 0.0–0.1 mm |
| Snug or sliding (lids, drawers, pins that must hold) | 0.15–0.25 mm |
| Free or loose (easy removal, rotating on a pin) | 0.3–0.4 mm |
| Print-in-place moving parts | 0.4–0.5 mm |

For tight fits, offer a test print of only the mating feature.

## Hardware

**Metric screws, ISO 273 medium clearance holes:**

| Size | M2 | M2.5 | M3 | M4 | M5 | M6 |
|---|---|---|---|---|---|---|
| Clearance hole | 2.4 | 2.9 | 3.4 | 4.5 | 5.5 | 6.6 |
| Self-tapping pilot in plastic (about 0.85 d) | 1.7 | 2.1 | 2.5 | 3.4 | 4.2 | 5.1 |
| Socket head diameter (ISO 4762) | 3.8 | 4.5 | 5.5 | 7.0 | 8.5 | 10.0 |
| Socket head height (ISO 4762) | 2.0 | 2.5 | 3.0 | 4.0 | 5.0 | 6.0 |
| Hex nut across flats (ISO 4032) | 4.0 | 5.0 | 5.5 | 7.0 | 8.0 | 10.0 |
| Hex nut thickness (ISO 4032) | 1.6 | 2.0 | 2.4 | 3.2 | 4.7 | 5.2 |

- **Counterbores:** head diameter + 0.5–1.0 mm, and head height + 0.2 mm.
- **Countersinks** for 90° flat heads: cone from the clearance diameter to about 2 × d at the surface.
- **Nut traps:** across flats + 0.2–0.3 mm. Model the hex as `circle(d = af / cos(30), $fn = 6)`, with flats oriented so they don't overhang.
- **Heat-set inserts:** hole and length vary by brand. Ask for the product or its datasheet values. Do not guess.
- **Self-tapping bosses:** outer diameter of at least 2.5 × the screw diameter.
- **Magnets, bearings, and other purchased parts:** use the user's nominal size plus a press or snug clearance from the table above.

## Strength and orientation

- Layers are weakest in tension along z. Orient the part so its main loads and bending run along the layers, in XY.
- Snap-fit arms and flexures lie flat in XY. Taper them along their length, and keep the strain low: arm length of at least 5 × its thickness for PLA.
- Fillet inside corners that carry load. In XY, use `offset(r = …)`.
- Ribs and gussets stiffen better than thicker walls.

## Text and small details

- **Minimum feature size:** about the nozzle width (0.4–0.5 mm). Embossed or engraved text needs strokes of at least 0.5 mm and a size of about 5 mm or more.
- **Depth:** emboss or engrave 0.6–1.0 mm deep. Top surfaces give the cleanest text.
- **Fonts:** name the font with a bold style (e.g. `"Liberation Sans:style=Bold"`). The font must be installed where the file is rendered; mention it in the header.
