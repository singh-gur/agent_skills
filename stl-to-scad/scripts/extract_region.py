#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "trimesh>=4.4",
#   "numpy>=1.26",
#   "manifold3d>=2.5",
# ]
# ///
"""Emit OpenSCAD modules reproducing one box-bounded region of a reference mesh.

Use only after the user approves a mesh-derived region. Prints two modules:
  <name>_region()      polyhedron() of the reference clipped to the box grown by --overlap
  <name>_region_box()  the exact box, used to clear primitive geometry there

The overlap makes the region interpenetrate the surrounding primitive geometry;
exactly coincident cut faces make OpenSCAD's CGAL union fail.

Splice pattern:
    union() { difference() { body(); <name>_region_box(); } <name>_region(); }

Usage:
    uv run scripts/extract_region.py reference.stl --box x0,y0,z0,x1,y1,z1 --name logo
"""
from __future__ import annotations

import argparse
import sys

import numpy as np
import trimesh


def fmt(v: float, digits: int) -> str:
    text = f"{v:.{digits}f}".rstrip("0").rstrip(".")
    return "0" if text in ("-0", "") else text


def rows(items: list[str], per_line: int, indent: str) -> str:
    chunks = [", ".join(items[i:i + per_line]) for i in range(0, len(items), per_line)]
    return (",\n" + indent).join(chunks)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("reference")
    parser.add_argument("--box", required=True, help="x0,y0,z0,x1,y1,z1 clipping box in model coordinates")
    parser.add_argument("--name", required=True, help="identifier prefix for the emitted modules")
    parser.add_argument("--digits", type=int, default=3, help="decimal places for point coordinates")
    parser.add_argument("--overlap", type=float, default=0.01, help="grow the clip box by this much")
    args = parser.parse_args()

    if not args.name.isidentifier():
        sys.exit(f"error: --name '{args.name}' is not a valid identifier")
    bounds = np.array([float(v) for v in args.box.split(",")]).reshape(2, 3)
    if np.any(bounds[1] <= bounds[0]):
        sys.exit("error: --box max corner must exceed min corner on every axis")

    reference = trimesh.load(args.reference, force="mesh")
    if not reference.is_volume:
        sys.exit("error: reference is not a closed volume; run scripts/repair_stl.py first")
    clip = trimesh.creation.box(bounds=bounds + np.array([[-1], [1]]) * args.overlap)
    region = trimesh.boolean.intersection([reference, clip], engine="manifold")
    if region.is_empty:
        sys.exit("error: the box does not intersect the reference mesh")
    if len(region.faces) > 5000:
        print(f"warning: region has {len(region.faces)} faces; shrink --box to keep the SCAD file manageable",
              file=sys.stderr)

    # OpenSCAD wants faces clockwise seen from outside; trimesh stores them counter-clockwise.
    points = [f"[{', '.join(fmt(c, args.digits) for c in p)}]" for p in region.vertices]
    faces = [f"[{', '.join(str(i) for i in f[::-1])}]" for f in region.faces]
    size = bounds[1] - bounds[0]
    print(f"// Mesh-derived region '{args.name}' clipped to box {bounds[0].tolist()}..{bounds[1].tolist()} "
          f"+ {args.overlap} overlap")
    print(f"// {len(region.faces)} faces")
    print(f"module {args.name}_region() {{\n    polyhedron(\n        points = [\n            "
          f"{rows(points, 6, ' ' * 12)}\n        ],\n        faces = [\n            "
          f"{rows(faces, 10, ' ' * 12)}\n        ]\n    );\n}}\n")
    print(f"module {args.name}_region_box() {{\n    translate([{', '.join(fmt(c, args.digits) for c in bounds[0])}])\n"
          f"        cube([{', '.join(fmt(c, args.digits) for c in size)}]);\n}}")


if __name__ == "__main__":
    main()
