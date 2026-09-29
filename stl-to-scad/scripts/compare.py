#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "trimesh>=4.4",
#   "numpy>=1.26",
#   "scipy>=1.11",
#   "shapely>=2.0",
#   "networkx>=3.0",
#   "rtree>=1.2",
#   "manifold3d>=2.5",
# ]
# ///
"""Render an OpenSCAD candidate and score it against a reference STL.

Measures bounding-box and feature dimensions, volume IoU, two-way surface
deviation, and locates missing/extra material. Writes candidate.stl,
missing.stl, extra.stl, diff PNGs, metrics.json and appends history.jsonl in
--work-dir.

Exit codes: 0 = all criteria pass, 1 = criteria fail, 2 = render/load error.

Usage:
    uv run scripts/compare.py reference.stl candidate.scad --work-dir DIR [--label iter-3]
        [--dim-tol 0.1] [--max-dev 0.25] [--min-iou 0.99] [--samples 30000] [--no-render]
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
from scipy import ndimage

import analyze_stl as an

OPENSCAD = os.environ.get("OPENSCAD", "openscad")
VIEWS = {  # name -> (gimbal rotation, projection)
    "iso": ("55,0,25", "p"),
    "top": ("0,0,0", "o"),
    "front": ("90,0,0", "o"),
    "right": ("90,0,90", "o"),
}
SHAPE_PARAMS = {"circle": ("d",), "rect": ("size", "angle"), "rounded_rect": ("size", "r", "angle")}


def run_openscad(args: list[str], what: str) -> list[str]:
    """Run OpenSCAD; return warning lines or exit(2) with the error output."""
    try:
        proc = subprocess.run([OPENSCAD, *args], capture_output=True, text=True, timeout=1800)
    except FileNotFoundError:
        sys.exit(f"error: OpenSCAD binary '{OPENSCAD}' not found; install it or set OPENSCAD")
    except subprocess.TimeoutExpired:
        sys.exit(f"error: OpenSCAD timed out while {what}")
    lines = (proc.stdout + proc.stderr).splitlines()
    errors = [ln for ln in lines if "ERROR" in ln]
    if proc.returncode != 0 or errors:
        print(f"error: OpenSCAD failed while {what}:", *(errors or lines[-20:]), sep="\n", file=sys.stderr)
        sys.exit(2)
    return [ln.strip() for ln in lines if "WARNING" in ln or "DEPRECATED" in ln]


def load_candidate(path: Path, work: Path) -> tuple[trimesh.Trimesh, list[str], float]:
    if path.suffix.lower() == ".stl":
        return an.load_mesh(str(path)), [], 0.0
    out = work / "candidate.stl"
    out.unlink(missing_ok=True)
    start = time.monotonic()
    warnings = run_openscad(["-o", str(out), str(path)], f"rendering {path}")
    elapsed = time.monotonic() - start
    if not out.exists():
        sys.exit(f"error: OpenSCAD produced no output for {path} (empty top-level geometry?)")
    return an.load_mesh(str(out)), warnings, elapsed


# ------------------------------------------------------------------ metrics

def bbox_metrics(ref: trimesh.Trimesh, cand: trimesh.Trimesh, dim_tol: float) -> dict:
    d_min, d_max = cand.bounds[0] - ref.bounds[0], cand.bounds[1] - ref.bounds[1]
    worst = float(max(np.abs(d_min).max(), np.abs(d_max).max()))
    return {"ref_min": an.rnd(ref.bounds[0]), "ref_max": an.rnd(ref.bounds[1]),
            "delta_min": an.rnd(d_min), "delta_max": an.rnd(d_max),
            "worst": an.rnd(worst), "pass": worst <= dim_tol}


def material_diff(ref: trimesh.Trimesh, cand: trimesh.Trimesh, work: Path) -> dict:
    """Exact volume IoU plus located missing/extra material via manifold booleans."""
    if not (ref.is_volume and cand.is_volume):
        which = [n for n, m in (("reference", ref), ("candidate", cand)) if not m.is_volume]
        return {"iou": None, "note": f"{' and '.join(which)} not a closed volume; IoU skipped"}
    inter = trimesh.boolean.intersection([ref, cand], engine="manifold")
    iou = inter.volume / (ref.volume + cand.volume - inter.volume)
    result = {"iou": round(float(iou), 5), "ref_volume": an.rnd(ref.volume),
              "cand_volume": an.rnd(cand.volume)}
    floor = max(1e-4 * ref.volume, 1e-3)
    for name, parts in (("missing", [ref, cand]), ("extra", [cand, ref])):
        diff = trimesh.boolean.difference(parts, engine="manifold")
        path = work / f"{name}.stl"
        path.unlink(missing_ok=True)
        regions = []
        if not diff.is_empty:
            diff.export(path)
            for comp in diff.split(only_watertight=False):
                if abs(comp.volume) >= floor:
                    regions.append({"volume": an.rnd(abs(comp.volume)), "centroid": an.rnd(comp.centroid),
                                    "bbox_min": an.rnd(comp.bounds[0]), "bbox_max": an.rnd(comp.bounds[1])})
        regions.sort(key=lambda r: -r["volume"])
        result[f"{name}_volume"] = an.rnd(sum(r["volume"] for r in regions))
        result[f"{name}_regions"] = regions[:8]
    return result


def hotspots(points: np.ndarray, dist: np.ndarray, inside: np.ndarray, threshold: float,
             cell: float, area_per_point: float, labels: tuple[str, str]) -> list[dict]:
    """Cluster over-threshold samples on a coarse grid; label by which side of the other mesh they lie."""
    mask = dist > threshold
    if not mask.any():
        return []
    p, d, ins = points[mask], dist[mask], inside[mask]
    idx = np.floor((p - p.min(axis=0)) / cell).astype(int)
    grid = np.zeros(idx.max(axis=0) + 1, dtype=bool)
    grid[tuple(idx.T)] = True
    grid_labels, count = ndimage.label(grid, structure=np.ones((3, 3, 3)))
    point_labels = grid_labels[tuple(idx.T)]
    out = []
    for k in range(1, count + 1):
        sel = point_labels == k
        out.append({
            "kind": labels[0] if ins[sel].mean() >= 0.5 else labels[1],
            "area": an.rnd(sel.sum() * area_per_point, 2),
            "max_dev": an.rnd(d[sel].max()),
            "centroid": an.rnd(p[sel].mean(axis=0)),
            "bbox_min": an.rnd(p[sel].min(axis=0)),
            "bbox_max": an.rnd(p[sel].max(axis=0)),
        })
    out.sort(key=lambda h: -h["area"] * h["max_dev"])
    return out


def surface_deviation(ref: trimesh.Trimesh, cand: trimesh.Trimesh, samples: int, max_dev: float) -> dict:
    diag = float(np.linalg.norm(ref.extents))
    cell = max(3 * max_dev, diag / 60)
    result, spots = {}, []
    directions = (
        # (name, sampled mesh, target mesh, labels when sample is inside / outside target)
        ("ref_to_cand", ref, cand, ("reference surface buried in candidate material: candidate has EXTRA material",
                                    "reference surface not reached: candidate is MISSING material")),
        ("cand_to_ref", cand, ref, ("candidate surface inside reference material: candidate has a spurious cavity/cut",
                                    "candidate surface outside reference: candidate has EXTRA material")),
    )
    for name, src, dst, labels in directions:
        pts, _ = trimesh.sample.sample_surface(src, samples, seed=0)
        _, dist, _ = trimesh.proximity.ProximityQuery(dst).on_surface(pts)
        result[name] = {"max": an.rnd(dist.max()), "p95": an.rnd(np.percentile(dist, 95)),
                        "mean": an.rnd(dist.mean(), 4)}
        if (dist > max_dev).any():
            inside = np.zeros(len(pts), dtype=bool)
            far = dist > max_dev
            if dst.is_watertight:
                inside[far] = dst.contains(pts[far])
            spots += hotspots(pts, dist, inside, max_dev, cell, src.area / samples, labels)
    worst = max(result["ref_to_cand"]["max"], result["cand_to_ref"]["max"])
    spots.sort(key=lambda h: -h["area"] * h["max_dev"])
    return {**result, "max": worst, "pass": worst <= max_dev, "hotspots": spots[:10]}


def _shapes(section: list[dict]) -> list[tuple[str, dict]]:
    return [(role, s) for o in section
            for role, s in [("outer", o["outer"]), *(("hole", h) for h in o["holes"])]]


def _center(shape: dict) -> np.ndarray:
    if "center" in shape:
        return np.array(shape["center"])
    b = shape["bounds"]
    return np.array([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2])


def feature_check(ref: trimesh.Trimesh, cand: trimesh.Trimesh, dim_tol: float, tol: float) -> dict:
    """Section both meshes at the reference's constant-band mid-levels and diff the classified shapes."""
    issues, matched = [], 0
    reach = max(1.0, 0.05 * float(ref.extents.max()))
    ref_levels = an.planes(ref, tol)["axis_levels"]
    for axis in an.AXES:
        edges = an.band_edges(ref, axis, ref_levels[axis], tol)
        for band in an.bands(ref, axis, edges, tol, max_vertices=0):
            if not band["constant"]:
                continue
            level = (band["from"] + band["to"]) / 2
            where = f"{axis}={an.rnd(level)}"
            cand_shapes = _shapes(an.describe_section(an.section(cand, axis, level), tol, 0))
            used = set()
            for role, rs in _shapes(band["outlines"]):
                options = [(np.linalg.norm(_center(cs) - _center(rs)), i) for i, (crole, cs) in enumerate(cand_shapes)
                           if i not in used and crole == role and cs["kind"] == rs["kind"]]
                dist, best = min(options, default=(np.inf, None))
                if best is None or dist > reach:
                    issues.append(f"section {where}: {role} {an.shape_text(rs)} has no matching candidate shape")
                    continue
                used.add(best)
                cs = cand_shapes[best][1]
                deltas = [f"center off by {an.rnd(dist)}"] if dist > dim_tol else []
                for key in SHAPE_PARAMS.get(rs["kind"], ()):
                    delta = np.abs(np.subtract(cs[key], rs[key]))
                    limit = 0.5 if key == "angle" else dim_tol
                    if np.any(delta > limit):
                        deltas.append(f"{key} {cs[key]} vs ref {rs[key]}")
                if rs["kind"] == "polygon" and abs(cs["area"] - rs["area"]) > dim_tol * rs["area"] ** 0.5 * 4:
                    deltas.append(f"area {cs['area']} vs ref {rs['area']}")
                if deltas:
                    issues.append(f"section {where}: {role} {an.shape_text(rs)}: " + "; ".join(deltas))
                else:
                    matched += 1
            for i, (role, cs) in enumerate(cand_shapes):
                if i not in used:
                    issues.append(f"section {where}: candidate has extra {role} {an.shape_text(cs)}")
    return {"matched": matched, "issues": issues, "pass": not issues}


# ------------------------------------------------------------------ renders

def render_views(ref_path: Path, work: Path) -> list[str]:
    parts = [f'color([0.6, 0.6, 0.6, 0.3]) import("{ref_path.resolve()}");']
    for name, color in (("missing", "red"), ("extra", "blue")):
        if (work / f"{name}.stl").exists():
            parts.append(f'color("{color}") import("{name}.stl");')
    overlay = work / "diff_overlay.scad"
    overlay.write_text("\n".join(parts) + "\n")
    written = []
    for name, (rot, proj) in VIEWS.items():
        png = work / f"diff_{name}.png"
        run_openscad(["-o", str(png), "--imgsize=800,600", f"--camera=0,0,0,{rot},0", "--viewall",
                      "--autocenter", f"--projection={proj}", "--colorscheme=Tomorrow", str(overlay)],
                     f"rendering {png.name}")
        written.append(str(png))
    return written


# ------------------------------------------------------------------ report

def summary(m: dict) -> str:
    c, b, v, s, f = m["criteria"], m["bbox"], m["volume"], m["surface"], m["features"]
    mark = {True: "PASS", False: "FAIL", None: "SKIP"}
    lines = [f"# Compare {m['label']}: {'PASS' if m['pass'] else 'FAIL'}", "",
             "| criterion | value | target | result |", "|---|---|---|---|",
             f"| bbox dims | worst {b['worst']} | <= {c['dim_tol']} | {mark[b['pass']]} |",
             f"| feature dims | {len(f['issues'])} issues, {f['matched']} matched | 0 issues | {mark[f['pass']]} |",
             f"| max deviation | {s['max']} | <= {c['max_dev']} | {mark[s['pass']]} |",
             f"| volume IoU | {v['iou']} | >= {c['min_iou']} | {mark[v.get('pass')]} |",
             "", f"- bbox delta min={b['delta_min']} max={b['delta_max']}",
             f"- deviation ref->cand {s['ref_to_cand']}, cand->ref {s['cand_to_ref']}"]
    if v["iou"] is None:
        lines.append(f"- NOTE: {v['note']}")
    else:
        lines.append(f"- volume ref={v['ref_volume']} cand={v['cand_volume']} "
                     f"missing={v['missing_volume']} extra={v['extra_volume']}")
    if m["render_seconds"]:
        lines.append(f"- OpenSCAD render time {m['render_seconds']:.1f}s")
    lines += [f"- OpenSCAD: {w}" for w in m["openscad_warnings"]]
    for name in ("missing", "extra"):
        for r in v.get(f"{name}_regions", []):
            lines.append(f"- {name.upper()} material {r['volume']} mm^3 around {r['centroid']} "
                         f"(bbox {r['bbox_min']}..{r['bbox_max']})")
    for h in s["hotspots"]:
        lines.append(f"- hotspot max_dev={h['max_dev']} area~{h['area']} at {h['centroid']} "
                     f"(bbox {h['bbox_min']}..{h['bbox_max']}): {h['kind']}")
    lines += [f"- feature: {i}" for i in f["issues"][:30]]
    if len(f["issues"]) > 30:
        lines.append(f"- ... {len(f['issues']) - 30} more feature issues in metrics.json")
    if m["renders"]:
        lines.append(f"- renders (grey=reference, red=missing, blue=extra): {', '.join(m['renders'])}")
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("reference", type=Path, help="reference STL")
    parser.add_argument("candidate", type=Path, help="candidate .scad (or .stl)")
    parser.add_argument("--work-dir", type=Path, required=True, help="scratch directory for artifacts")
    parser.add_argument("--label", default="", help="iteration label recorded in history.jsonl")
    parser.add_argument("--dim-tol", type=float, default=0.1, help="max bbox/feature dimension error")
    parser.add_argument("--max-dev", type=float, default=0.25, help="max two-way surface deviation")
    parser.add_argument("--min-iou", type=float, default=0.99, help="min volume intersection-over-union")
    parser.add_argument("--tol", type=float, default=0.02, help="shape classification tolerance")
    parser.add_argument("--samples", type=int, default=30000, help="surface samples per mesh")
    parser.add_argument("--no-render", action="store_true", help="skip diff PNG renders")
    args = parser.parse_args()

    args.work_dir.mkdir(parents=True, exist_ok=True)
    ref = an.load_mesh(str(args.reference))
    cand, warnings, seconds = load_candidate(args.candidate, args.work_dir)

    volume = material_diff(ref, cand, args.work_dir)
    volume["pass"] = None if volume["iou"] is None else volume["iou"] >= args.min_iou
    metrics = {
        "label": args.label or args.candidate.name,
        "criteria": {"dim_tol": args.dim_tol, "max_dev": args.max_dev, "min_iou": args.min_iou},
        "openscad_warnings": warnings,
        "render_seconds": round(seconds, 2),
        "bbox": bbox_metrics(ref, cand, args.dim_tol),
        "volume": volume,
        "surface": surface_deviation(ref, cand, args.samples, args.max_dev),
        "features": feature_check(ref, cand, args.dim_tol, args.tol),
        "renders": [] if args.no_render else render_views(args.reference, args.work_dir),
    }
    checks = [metrics["bbox"]["pass"], metrics["features"]["pass"], metrics["surface"]["pass"], volume["pass"]]
    metrics["pass"] = all(c is not False for c in checks)

    (args.work_dir / "metrics.json").write_text(json.dumps(metrics, indent=1))
    history = {k: metrics[k] for k in ("label", "pass")} | {
        "bbox_worst": metrics["bbox"]["worst"], "max_dev": metrics["surface"]["max"],
        "iou": volume["iou"], "feature_issues": len(metrics["features"]["issues"]),
    }
    with open(args.work_dir / "history.jsonl", "a") as fh:
        fh.write(json.dumps(history) + "\n")
    sys.stdout.write(summary(metrics))
    sys.exit(0 if metrics["pass"] else 1)


if __name__ == "__main__":
    main()
