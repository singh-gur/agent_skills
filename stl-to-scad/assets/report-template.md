# <name>: STL → SCAD conversion report

- Source: `<name>.stl` (<faces> faces, watertight: <yes/no; repaired: yes/no>)
- Output: `<name>.scad`
- Result: <PASS | FAIL on: criteria>
- Iterations: <n> (best: iter-<k>, plus cleanup)

## Final metrics

| Criterion | Value | Target | Result |
|---|---|---|---|
| Bounding-box dimensions (worst delta) | | ±<dim_tol> mm | |
| Feature dimensions (issues / matched) | | 0 issues | |
| Max surface deviation | | ≤ <max_dev> mm | |
| Volume IoU | | ≥ <min_iou> | |

## Iteration history

| Label | Pass | bbox worst | max dev | IoU | feature issues | Change made |
|---|---|---|---|---|---|---|
| iter-1 | | | | | | initial model |

## Feature tree

- <base body: construct and source evidence>
- <added features>
- <removed features>

## Residual issues and user decisions

- <region/location, deviation, decision (accepted residual / mesh-derived / excluded) or unresolved cause>
