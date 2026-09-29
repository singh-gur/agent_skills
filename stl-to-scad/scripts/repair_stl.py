#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "trimesh>=4.4",
#   "numpy>=1.26",
#   "scipy>=1.11",
#   "rtree>=1.2",
#   "pymeshfix>=0.17",
# ]
# ///
"""Repair a non-watertight STL so volume IoU and section analysis work.

Runs MeshFix (hole filling, self-intersection and degenerate-face removal),
then reports how far the repaired surface moved from the original. Only use
the repaired mesh as the comparison reference when that movement is well
below the deviation target.

Usage:
    uv run scripts/repair_stl.py input.stl output.stl
"""
from __future__ import annotations

import argparse
import sys

import numpy as np
import pymeshfix
import trimesh


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--samples", type=int, default=20000, help="surface samples for the movement check")
    args = parser.parse_args()

    try:
        original = trimesh.load(args.input, force="mesh")
    except Exception as exc:  # trimesh raises many exception types for bad files
        sys.exit(f"error: cannot load {args.input}: {exc}")
    if original.is_watertight:
        print(f"{args.input} is already watertight; no repair needed")
        return

    vertices, faces = pymeshfix.clean_from_arrays(
        np.ascontiguousarray(original.vertices, dtype=np.float64),
        np.ascontiguousarray(original.faces, dtype=np.int32),
    )
    repaired = trimesh.Trimesh(vertices, faces)
    if repaired.is_empty:
        sys.exit("error: MeshFix removed every face; the input is too damaged to repair automatically")

    pts, _ = trimesh.sample.sample_surface(original, args.samples, seed=0)
    _, moved, _ = trimesh.proximity.ProximityQuery(repaired).on_surface(pts)
    repaired.export(args.output)

    print(f"watertight: {original.is_watertight} -> {repaired.is_watertight}")
    print(f"faces: {len(original.faces)} -> {len(repaired.faces)}")
    print(f"bbox delta: min {np.round(repaired.bounds[0] - original.bounds[0], 4).tolist()} "
          f"max {np.round(repaired.bounds[1] - original.bounds[1], 4).tolist()}")
    print(f"original surface -> repaired surface: max {moved.max():.4f} p95 {np.percentile(moved, 95):.4f}")
    if repaired.is_watertight:
        print(f"volume: {repaired.volume:.3f}")
    else:
        print("WARNING: still not watertight; IoU and section checks stay unreliable")
    print(f"wrote {args.output}")


if __name__ == "__main__":
    main()
