#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "trimesh>=4.4",
#   "numpy>=1.26",
#   "scipy>=1.11",
#   "networkx>=3.0",
#   "rtree>=1.2",
# ]
# ///
"""Render an OpenSCAD design and check it for FDM printing.

Renders the .scad to STL, writes iso/top/front/right PNG views, and reports
OpenSCAD warnings, body count, watertightness, bounding box, volume, build-plate
contact, overhang regions, and thin-wall regions. Writes <label>.stl,
<label>_<view>.png and <label>.json in --work-dir.

Hard failures (exit 1): OpenSCAD warnings, non-watertight mesh, any body without
a flat face on z = 0, or a bounding-box size outside --expect-size +/- --size-tol.
Overhangs and thin walls are REVIEW items: judge them against the design (bridges
and chamfered hole tops are often fine); they never fail the check.

Exit codes: 0 = no hard failures, 1 = hard failures, 2 = render/load error.

Usage:
    uv run --script scripts/render_check.py design.scad --work-dir DIR [--label iter-1]
        [--expect-size X,Y,Z] [--size-tol 0.1] [--overhang 45] [--min-wall 1.2]
        [--samples 4000] [-D name=value ...]
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import trimesh

OPENSCAD = os.environ.get("OPENSCAD", "openscad")
VIEWS = {  # name -> (gimbal rotation, projection)
    "iso": ("55,0,25", "p"),
    "top": ("0,0,0", "o"),
    "front": ("90,0,0", "o"),
    "right": ("90,0,90", "o"),
}
BED_TOL = 0.01  # faces within this height of z = 0 count as build-plate contact


def rnd(v, n: int = 3):
    if isinstance(v, (list, tuple, np.ndarray)):
        return [round(float(x), n) for x in v]
    return round(float(v), n)


def run_openscad(args: list[str], what: str) -> list[str]:
    """Run OpenSCAD; return warning lines or exit(2) with the error output."""
    try:
        proc = subprocess.run([OPENSCAD, *args], capture_output=True, text=True, timeout=1800)
    except FileNotFoundError:
        sys.exit(f"error: OpenSCAD binary '{OPENSCAD}' not found; install it or set OPENSCAD")
    except subprocess.TimeoutExpired:
        print(f"error: OpenSCAD timed out after 30 min while {what}", file=sys.stderr)
        sys.exit(2)
    lines = (proc.stdout + proc.stderr).splitlines()
    errors = [ln for ln in lines if "ERROR" in ln]
    if proc.returncode != 0 or errors:
        print(f"error: OpenSCAD failed while {what}:", *(errors or lines[-20:]), sep="\n", file=sys.stderr)
        sys.exit(2)
    return [ln.strip() for ln in lines if "WARNING" in ln or "DEPRECATED" in ln]


def bed_area(mesh: trimesh.Trimesh) -> float:
    """Area of downward-facing faces lying on z = 0."""
    down = np.abs(mesh.face_normals[:, 2] + 1) < 1e-6
    on_bed = mesh.triangles[:, :, 2].max(axis=1) <= BED_TOL
    return float(mesh.area_faces[down & on_bed].sum())


def face_regions(mesh: trimesh.Trimesh, mask: np.ndarray, min_area: float, limit: int = 8) -> list[dict]:
    """Group flagged faces into edge-connected regions; return the largest."""
    idx = np.flatnonzero(mask)
    if idx.size == 0:
        return []
    adj = mesh.face_adjacency
    keep = mask[adj[:, 0]] & mask[adj[:, 1]]
    groups = trimesh.graph.connected_components(adj[keep], nodes=idx, min_len=1)
    regions = []
    for faces in groups:
        area = float(mesh.area_faces[faces].sum())
        if area < min_area:
            continue
        pts = mesh.triangles[faces].reshape(-1, 3)
        regions.append({"area": rnd(area, 2), "bbox_min": rnd(pts.min(0)), "bbox_max": rnd(pts.max(0))})
    regions.sort(key=lambda r: -r["area"])
    return regions[:limit]


def overhangs(mesh: trimesh.Trimesh, max_angle: float) -> dict:
    """Downward faces steeper than max_angle from vertical, excluding build-plate faces."""
    nz = mesh.face_normals[:, 2]
    on_bed = mesh.triangles[:, :, 2].max(axis=1) <= BED_TOL
    mask = (-nz > np.sin(np.radians(max_angle))) & ~on_bed
    return {"max_angle": max_angle, "area": rnd(mesh.area_faces[mask].sum(), 2),
            "regions": face_regions(mesh, mask, min_area=1.0)}


def thin_walls(mesh: trimesh.Trimesh, min_wall: float, samples: int) -> dict:
    """Ray-cast inward from surface samples; local thickness is the distance to the next hit."""
    pts, fids = trimesh.sample.sample_surface_even(mesh, samples, seed=0)
    normals = mesh.face_normals[fids]
    origins = pts - normals * 1e-4
    locs, ray_idx, _ = mesh.ray.intersects_location(origins, -normals, multiple_hits=False)
    thick = np.full(len(pts), np.inf)
    if len(ray_idx):
        thick[ray_idx] = np.linalg.norm(locs - origins[ray_idx], axis=1)
    finite = thick[np.isfinite(thick)]
    thin_faces = np.zeros(len(mesh.faces), dtype=bool)
    thin_faces[fids[thick < min_wall]] = True
    regions = face_regions(mesh, thin_faces, min_area=0.0)
    return {"min_wall": min_wall, "samples": int(len(pts)),
            "min_thickness": rnd(finite.min()) if finite.size else None,
            "thin_fraction": rnd(float((thick < min_wall).mean()), 4),
            "regions": regions}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("scad", type=Path)
    ap.add_argument("--work-dir", type=Path, required=True)
    ap.add_argument("--label", default="check")
    ap.add_argument("--expect-size", help="expected bbox size X,Y,Z in mm")
    ap.add_argument("--size-tol", type=float, default=0.1)
    ap.add_argument("--overhang", type=float, default=45.0, help="max unsupported angle from vertical, degrees")
    ap.add_argument("--min-wall", type=float, default=1.2)
    ap.add_argument("--samples", type=int, default=4000, help="surface samples for the thin-wall check")
    ap.add_argument("-D", dest="defines", action="append", default=[], metavar="NAME=VALUE",
                    help="override a parameter, passed to OpenSCAD -D (repeatable)")
    args = ap.parse_args()

    if not args.scad.exists():
        sys.exit(f"error: {args.scad} not found")
    work = args.work_dir
    work.mkdir(parents=True, exist_ok=True)
    defines = [x for d in args.defines for x in ("-D", d)]

    stl = work / f"{args.label}.stl"
    stl.unlink(missing_ok=True)
    start = time.monotonic()
    warnings = run_openscad(["-o", str(stl), *defines, str(args.scad)], f"rendering {args.scad}")
    elapsed = time.monotonic() - start
    if not stl.exists():
        print(f"error: OpenSCAD produced no output for {args.scad} (empty top-level geometry?)", file=sys.stderr)
        sys.exit(2)
    try:
        mesh = trimesh.load_mesh(stl, process=True)
    except Exception as exc:  # trimesh raises varied types on bad files
        print(f"error: cannot load {stl}: {exc}", file=sys.stderr)
        sys.exit(2)
    if mesh.is_empty:
        print(f"error: {stl} is empty", file=sys.stderr)
        sys.exit(2)

    view = work / f"{args.label}_view.scad"
    view.write_text(f'color("gold") import("{stl.resolve().as_posix()}");\n')
    pngs = []
    for name, (rot, proj) in VIEWS.items():
        png = work / f"{args.label}_{name}.png"
        run_openscad(["-o", str(png), "--imgsize=800,600", f"--camera=0,0,0,{rot},0", "--viewall",
                      "--autocenter", f"--projection={proj}", "--colorscheme=Tomorrow", str(view)],
                     f"rendering {png.name}")
        pngs.append(str(png))

    bodies = mesh.split(only_watertight=False)
    floating = [{"body": i, "min_z": rnd(b.bounds[0][2]), "bbox_min": rnd(b.bounds[0]), "bbox_max": rnd(b.bounds[1])}
                for i, b in enumerate(bodies) if bed_area(b) == 0]
    size = mesh.extents
    report = {
        "scad": str(args.scad), "label": args.label, "defines": args.defines,
        "render_seconds": round(elapsed, 1), "warnings": warnings,
        "bodies": len(bodies), "watertight": bool(mesh.is_watertight), "volume_ok": bool(mesh.is_volume),
        "bbox_min": rnd(mesh.bounds[0]), "bbox_max": rnd(mesh.bounds[1]), "size": rnd(size),
        "volume": rnd(mesh.volume, 1) if mesh.is_volume else None,
        "bed_contact_area": rnd(bed_area(mesh), 2), "floating_bodies": floating,
        "overhangs": overhangs(mesh, args.overhang),
        "thin_walls": thin_walls(mesh, args.min_wall, args.samples) if mesh.is_volume else None,
        "pngs": pngs,
    }

    failures = []
    if warnings:
        failures.append(f"{len(warnings)} OpenSCAD warning(s)")
    if not mesh.is_watertight:
        failures.append("mesh is not watertight (coincident faces or zero-thickness geometry?)")
    if abs(mesh.bounds[0][2]) > BED_TOL:
        failures.append(f"lowest point is z = {mesh.bounds[0][2]:.3f}, not 0")
    for f in floating:
        failures.append(f"body {f['body']} has no flat face on z = 0 (min z {f['min_z']}, "
                        f"bbox {f['bbox_min']} .. {f['bbox_max']})")
    if args.expect_size:
        want = np.array([float(v) for v in args.expect_size.split(",")])
        if want.shape != (3,):
            sys.exit("error: --expect-size needs X,Y,Z")
        delta = size - want
        report["size_delta"] = rnd(delta)
        if np.abs(delta).max() > args.size_tol:
            failures.append(f"size {rnd(size)} differs from expected {rnd(want)} by {rnd(delta)}")
    report["failures"] = failures
    (work / f"{args.label}.json").write_text(json.dumps(report, indent=2))

    print(f"== {args.label}: {args.scad}  (render {report['render_seconds']} s)")
    if args.defines:
        print("overrides:", " ".join(args.defines))
    print(f"size {report['size']}  bbox {report['bbox_min']} .. {report['bbox_max']}")
    print(f"bodies {report['bodies']}  watertight {report['watertight']}  volume {report['volume']} mm^3  "
          f"bed contact {report['bed_contact_area']} mm^2")
    for w in warnings:
        print("  warning:", w)
    oh = report["overhangs"]
    print(f"REVIEW overhangs > {oh['max_angle']} deg: {oh['area']} mm^2 in {len(oh['regions'])} region(s)")
    for r in oh["regions"]:
        print(f"  area {r['area']} mm^2  bbox {r['bbox_min']} .. {r['bbox_max']}")
    tw = report["thin_walls"]
    if tw is None:
        print("REVIEW thin walls: skipped (not a closed volume)")
    else:
        print(f"REVIEW thin walls < {tw['min_wall']} mm: min thickness {tw['min_thickness']}  "
              f"{tw['thin_fraction'] * 100:.1f}% of samples in {len(tw['regions'])} region(s)")
        for r in tw["regions"]:
            print(f"  area {r['area']} mm^2  bbox {r['bbox_min']} .. {r['bbox_max']}")
    print("views:", *pngs, sep="\n  ")
    if failures:
        print("FAIL:", *failures, sep="\n  ")
        sys.exit(1)
    print("PASS: no hard failures")


if __name__ == "__main__":
    main()
