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
"""Summarise an STL mesh as OpenSCAD-oriented features.

Reports mesh health, bounding box, dominant planes, mirror symmetry, and
cross-section bands along one axis. Every section outline is classified as
circle, rect, rounded_rect, or polygon so it maps directly onto OpenSCAD 2D
primitives for linear_extrude / rotate_extrude.

Usage:
    uv run scripts/analyze_stl.py part.stl [--axis z] [--levels 2.5,7] [--tol 0.02] [--json out.json]
"""
from __future__ import annotations

import argparse
import json
import math
import sys

import numpy as np
import trimesh
from scipy.spatial import cKDTree
from shapely import affinity
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

AXES = {"x": 0, "y": 1, "z": 2}
# In-plane coordinates of a section taken perpendicular to each axis.
PLANE_2D = {"z": ("x", "y"), "y": ("x", "z"), "x": ("y", "z")}
PROFILE_AREA_TOL = 0.005  # relative symmetric-difference area treated as "same profile"


def load_mesh(path: str) -> trimesh.Trimesh:
    try:
        mesh = trimesh.load(path, force="mesh", process=True)
    except Exception as exc:  # trimesh raises many exception types for bad files
        sys.exit(f"error: cannot load {path}: {exc}")
    if not isinstance(mesh, trimesh.Trimesh) or mesh.is_empty:
        sys.exit(f"error: {path} contains no triangle mesh")
    mesh.merge_vertices()
    return mesh


def rnd(value, digits: int = 3):
    if isinstance(value, (list, tuple, np.ndarray)):
        return [rnd(v, digits) for v in value]
    value = round(float(value), digits)
    return 0.0 if value == 0 else value  # drop "-0.0"


# ---------------------------------------------------------------- mesh level

def health(mesh: trimesh.Trimesh) -> dict:
    bodies = mesh.split(only_watertight=False)
    info = {
        "faces": len(mesh.faces),
        "vertices": len(mesh.vertices),
        "watertight": bool(mesh.is_watertight),
        "winding_consistent": bool(mesh.is_winding_consistent),
        "bodies": len(bodies),
        "area": rnd(mesh.area),
        "volume": rnd(mesh.volume) if mesh.is_watertight else None,
    }
    if mesh.is_watertight and len(bodies) == 1:
        info["genus"] = int(round((2 - mesh.euler_number) / 2))
    return info


def bounding_box(mesh: trimesh.Trimesh) -> dict:
    lo, hi = mesh.bounds
    size = hi - lo
    notes = []
    if size.max() < 2:
        notes.append("largest extent < 2 units: file may be in metres or inches; OpenSCAD assumes mm")
    elif size.max() > 2000:
        notes.append("largest extent > 2000 units: file may be in microns")
    return {"min": rnd(lo), "max": rnd(hi), "size": rnd(size), "center": rnd((lo + hi) / 2), "notes": notes}


def planes(mesh: trimesh.Trimesh, tol: float, limit: int = 25) -> dict:
    """Group faces into planes (normal + offset) and rank them by area."""
    normals = np.round(mesh.face_normals, 4) + 0.0
    offsets = np.einsum("ij,ij->i", mesh.face_normals, mesh.triangles[:, 0])
    offsets = np.round(offsets / tol) * tol
    unique, inverse = np.unique(np.column_stack([normals, offsets]), axis=0, return_inverse=True)
    areas = np.bincount(inverse.ravel(), weights=mesh.area_faces)
    total = mesh.area

    ranked, levels = [], {a: {} for a in AXES}
    aligned_area = planar_area = 0.0
    for idx in np.argsort(areas)[::-1]:
        share = areas[idx] / total
        if share < 0.002:
            break
        n, d = unique[idx, :3], unique[idx, 3]
        axis = next((a for a, i in AXES.items() if abs(n[i]) > 0.9999), None)
        planar_area += areas[idx]
        entry = {"normal": rnd(n, 4), "offset": rnd(d), "area": rnd(areas[idx]), "share": rnd(share, 4)}
        if axis:
            aligned_area += areas[idx]
            sign = 1 if n[AXES[axis]] > 0 else -1
            level = float(d * sign)
            entry["label"] = f"{'+' if sign > 0 else '-'}{axis.upper()} face at {axis}={rnd(level)}"
            key = round(level / tol)
            levels[axis][key] = levels[axis].get(key, 0.0) + areas[idx]
        if len(ranked) < limit:
            ranked.append(entry)

    notes = []
    if planar_area and aligned_area / planar_area < 0.5:
        notes.append("most planar area is not axis-aligned: the part may be rotated; model it in a "
                     "canonical frame and apply one top-level rotate()/multmatrix()")
    axis_levels = {a: sorted(rnd(k * tol) for k in lv) for a, lv in levels.items()}
    return {"planes": ranked, "axis_levels": axis_levels, "notes": notes}


def mirror_symmetry(mesh: trimesh.Trimesh, samples: int = 4000) -> dict:
    """Compare reflected surface samples against the original about the bbox centre planes."""
    ref, _ = trimesh.sample.sample_surface(mesh, samples, seed=0)
    probe, _ = trimesh.sample.sample_surface(mesh, samples, seed=1)
    tree = cKDTree(ref)
    baseline = tree.query(probe)[0].mean()
    center = mesh.bounds.mean(axis=0)
    result = {}
    for axis, i in AXES.items():
        mirrored = probe.copy()
        mirrored[:, i] = 2 * center[i] - mirrored[:, i]
        score = tree.query(mirrored)[0].mean() / baseline
        result[axis] = {"plane": rnd(center[i]), "symmetric": bool(score < 1.5), "score": rnd(score, 2)}
    return result


# ------------------------------------------------------------ cross sections

def _to_2d_matrix(axis: str, level: float) -> np.ndarray:
    """Rigid transform taking the section plane to z=0 with in-plane coords PLANE_2D[axis]."""
    rows = {
        "z": [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, -level]],
        "y": [[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, level]],
        "x": [[0, 1, 0, 0], [0, 0, 1, 0], [1, 0, 0, -level]],
    }[axis]
    return np.array(rows + [[0, 0, 0, 1]], dtype=float)


def section(mesh: trimesh.Trimesh, axis: str, level: float) -> list[Polygon]:
    normal = np.eye(3)[AXES[axis]]
    path = mesh.section(plane_origin=normal * level, plane_normal=normal)
    if path is None:
        return []
    planar, _ = path.to_2D(to_2D=_to_2d_matrix(axis, level))
    return [p for p in planar.polygons_full if p.area > 1e-9]


def fit_circle(pts: np.ndarray) -> tuple[np.ndarray, float, float]:
    """Algebraic least-squares circle fit; returns centre, radius, rms radial error."""
    a = np.column_stack([2 * pts, np.ones(len(pts))])
    b = (pts ** 2).sum(axis=1)
    sol, *_ = np.linalg.lstsq(a, b, rcond=None)
    center = sol[:2]
    radius = math.sqrt(max(sol[2] + center @ center, 0.0))
    rms = float(np.sqrt(np.mean((np.linalg.norm(pts - center, axis=1) - radius) ** 2)))
    return center, radius, rms


def _rotated_rect(poly: Polygon) -> tuple[np.ndarray, float, float, float]:
    """Centre, width, height, angle (deg, in (-45, 45]) of the minimum rotated rectangle."""
    corners = np.asarray(poly.minimum_rotated_rectangle.exterior.coords)[:4]
    e1, e2 = corners[1] - corners[0], corners[2] - corners[1]
    w, h = np.linalg.norm(e1), np.linalg.norm(e2)
    angle = (math.degrees(math.atan2(e1[1], e1[0])) + 180) % 180  # direction of e1 in [0, 180)
    if angle > 135:
        angle -= 180
    elif angle > 45:
        angle -= 90
        w, h = h, w
    return corners.mean(axis=0), w, h, angle


def classify(poly: Polygon, tol: float, max_vertices: int) -> dict:
    """Map a simple polygon (holes ignored) onto the closest OpenSCAD 2D primitive.

    A primitive is accepted only when its outline stays within 5*tol of the section outline.
    """
    # Drop collinear points left by quad triangulation so `segments` matches the source $fn.
    poly = Polygon(poly.exterior).simplify(tol * 0.01, preserve_topology=True)
    pts = np.asarray(poly.exterior.coords)[:-1]
    limit = 5 * tol

    if len(pts) >= 8:
        center, radius, rms = fit_circle(pts)
        angles = np.sort(np.arctan2(*(pts - center).T[::-1]))
        max_gap = np.max(np.diff(np.concatenate([angles, angles[:1] + 2 * math.pi])))
        if rms < max(tol, 1e-3 * radius) and max_gap < math.radians(60):
            return {"kind": "circle", "center": rnd(center), "d": rnd(2 * radius), "segments": len(pts)}

    center, w, h, angle = _rotated_rect(poly)
    base = {"center": rnd(center), "size": rnd([w, h]), "angle": rnd(angle, 2)}
    if poly.exterior.hausdorff_distance(poly.minimum_rotated_rectangle.exterior) < limit:
        return {"kind": "rect", **base}
    if w * h > 0 and 0.75 < poly.area / (w * h) < 1:
        r = min(math.sqrt((w * h - poly.area) / (4 - math.pi)), min(w, h) / 2)
        model = box(-w / 2 + r, -h / 2 + r, w / 2 - r, h / 2 - r).buffer(r, quad_segs=32)
        model = affinity.translate(affinity.rotate(model, angle, origin=(0, 0)), *center)
        if poly.exterior.hausdorff_distance(model.exterior) < limit:
            return {"kind": "rounded_rect", **base, "r": rnd(r)}

    simple = poly.simplify(tol, preserve_topology=True)
    coords = np.asarray(simple.exterior.coords)[:-1]
    out = {"kind": "polygon", "vertex_count": len(coords), "bounds": rnd(simple.bounds), "area": rnd(poly.area)}
    if len(coords) <= max_vertices:
        out["points"] = rnd(coords)
    else:
        out["note"] = "too many vertices to list: likely freeform; raise --max-vertices to dump"
    return out


def describe_section(polys: list[Polygon], tol: float, max_vertices: int) -> list[dict]:
    return [
        {
            "outer": classify(p, tol, max_vertices),
            "holes": [classify(Polygon(ring), tol, max_vertices) for ring in p.interiors],
            "area": rnd(p.area),
        }
        for p in sorted(polys, key=lambda p: -p.area)
    ]


def same_profile(a: list[Polygon], b: list[Polygon]) -> bool:
    ua = unary_union(a) if a else Polygon()
    ub = unary_union(b) if b else Polygon()
    scale = max(ua.area, ub.area, 1e-9)
    return ua.symmetric_difference(ub).area / scale < PROFILE_AREA_TOL


def band_edges(mesh: trimesh.Trimesh, axis: str, levels: list[float], tol: float) -> list[float]:
    i = AXES[axis]
    lo, hi = mesh.bounds[:, i]
    edges = sorted({float(lo), float(hi), *(v for v in levels if lo < v < hi)})
    merged = [edges[0]]
    for v in edges[1:]:
        if v - merged[-1] > 5 * tol:
            merged.append(v)
    if len(merged) < 3:  # no interior steps: fall back to uniform bands to expose tapers/curves
        merged = list(np.linspace(lo, hi, 9))
    return merged


def bands(mesh: trimesh.Trimesh, axis: str, edges: list[float], tol: float, max_vertices: int) -> list[dict]:
    out = []
    for z0, z1 in zip(edges, edges[1:]):
        span = z1 - z0
        mid = section(mesh, axis, z0 + span / 2)
        constant = same_profile(section(mesh, axis, z0 + 0.1 * span), mid) and same_profile(
            mid, section(mesh, axis, z0 + 0.9 * span))
        if out and constant and out[-1]["constant"] and same_profile(out[-1]["_polys"], mid):
            out[-1]["to"] = rnd(z1)
            continue
        out.append({"from": rnd(z0), "to": rnd(z1), "constant": constant, "_polys": mid})
    for band in out:
        band["outlines"] = describe_section(band.pop("_polys"), tol, max_vertices)
        if not band["constant"]:
            band["note"] = ("profile varies inside band: taper, chamfer, fillet, or a feature along "
                            "another axis; re-run with --axis on the other axes")
    return out


def circle_features(band_list: list[dict], tol: float) -> list[dict]:
    """Track circles (bosses and holes) across constant bands and report their axial extent."""
    tracks: list[dict] = []
    for band in (b for b in band_list if b["constant"]):
        for outline in band["outlines"]:
            items = [("boss", outline["outer"])] + [("hole", h) for h in outline["holes"]]
            for role, shape in items:
                if shape["kind"] != "circle":
                    continue
                for t in tracks:
                    if (t["role"] == role and abs(t["d"] - shape["d"]) < 5 * tol
                            and np.linalg.norm(np.subtract(t["center"], shape["center"])) < 5 * tol
                            and abs(t["to"] - band["from"]) < 5 * tol):
                        t["to"] = band["to"]
                        break
                else:
                    tracks.append({"role": role, "center": shape["center"], "d": shape["d"],
                                   "segments": shape["segments"], "from": band["from"], "to": band["to"]})
    return tracks


# ------------------------------------------------------------ revolved parts

# axis -> (cut axis, index of the axis centre giving the cut level, radial 2D coord, axial 2D coord)
REVOLVE_CUT = {"z": ("y", 1, 0, 1), "y": ("z", 1, 0, 1), "x": ("z", 1, 1, 0)}


def revolve_profile(mesh: trimesh.Trimesh, axis: str, band_list: list[dict], tol: float) -> dict | None:
    """If every band is concentric circles, return the [radius, axial] half-profile for rotate_extrude."""
    centers = []
    for band in band_list:
        for outline in band["outlines"]:
            for shape in [outline["outer"], *outline["holes"]]:
                if shape["kind"] != "circle":
                    return None
                centers.append(shape["center"])
    if not centers:
        return None
    centers = np.array(centers)
    center = centers.mean(axis=0)
    if np.abs(centers - center).max() > 5 * tol:
        return None
    cut_axis, level_idx, radial_idx, axial_idx = REVOLVE_CUT[axis]
    big = 1e9
    keep = [center[0], -big, big, big] if radial_idx == 0 else [-big, center[0], big, big]
    profiles = []
    for poly in section(mesh, cut_axis, float(center[level_idx])):
        half = poly.intersection(box(*keep))
        for part in getattr(half, "geoms", [half]):
            if part.is_empty or part.area < 1e-9:
                continue
            coords = np.asarray(part.simplify(tol).exterior.coords)[:-1]
            profiles.append(rnd(np.column_stack([coords[:, radial_idx] - center[0], coords[:, axial_idx]])))
    return {"axis_center": rnd(center), "profiles_r_axial": profiles}


# ---------------------------------------------------------------- reporting

def analyze(mesh: trimesh.Trimesh, axis: str, extra_levels: list[float], tol: float, max_vertices: int) -> dict:
    plane_info = planes(mesh, tol)
    edges = band_edges(mesh, axis, plane_info["axis_levels"][axis] + extra_levels, tol)
    band_list = bands(mesh, axis, edges, tol, max_vertices)
    return {
        "health": health(mesh),
        "bbox": bounding_box(mesh),
        "planes": plane_info,
        "mirror_symmetry": mirror_symmetry(mesh),
        "section_axis": axis,
        "section_coords": PLANE_2D[axis],
        "bands": band_list,
        "circle_features": circle_features(band_list, tol),
        "revolve": revolve_profile(mesh, axis, band_list, tol),
    }


def shape_text(s: dict) -> str:
    if s["kind"] == "circle":
        return f"circle d={s['d']} at {s['center']} ({s['segments']} segments)"
    if s["kind"] in ("rect", "rounded_rect"):
        extra = f" r={s['r']}" if "r" in s else ""
        return f"{s['kind']} {s['size']}{extra} at {s['center']} angle={s['angle']}"
    detail = f"points={s['points']}" if "points" in s else s["note"]
    return f"polygon {s['vertex_count']} vertices bounds={s['bounds']} {detail}"


def report(path: str, a: dict) -> str:
    h, b = a["health"], a["bbox"]
    lines = [f"# STL analysis: {path}", "", "## Mesh",
             f"- faces={h['faces']} vertices={h['vertices']} bodies={h['bodies']} "
             f"watertight={h['watertight']} winding_consistent={h['winding_consistent']}",
             f"- volume={h['volume']} area={h['area']}" + (f" genus={h['genus']}" if "genus" in h else ""),
             "", "## Bounding box",
             f"- min={b['min']} max={b['max']} size={b['size']} center={b['center']}"]
    lines += [f"- NOTE: {n}" for n in b["notes"] + a["planes"]["notes"]]
    if not h["watertight"]:
        lines.append("- NOTE: mesh is not watertight; volume and IoU comparisons will be unavailable")

    lines += ["", "## Axis-aligned plane levels"]
    lines += [f"- {ax}: {lv}" for ax, lv in a["planes"]["axis_levels"].items() if lv]
    lines += ["", "## Largest planes"]
    for p in a["planes"]["planes"]:
        label = p.get("label") or f"normal={p['normal']} offset={p['offset']}"
        lines.append(f"- {label} area={p['area']} ({p['share'] * 100:.1f}%)")

    sym = [f"{ax} (plane {ax}={s['plane']})" for ax, s in a["mirror_symmetry"].items() if s["symmetric"]]
    lines += ["", "## Mirror symmetry", f"- symmetric about: {', '.join(sym) if sym else 'none detected'}"]

    u, v = a["section_coords"]
    lines += ["", f"## Sections along {a['section_axis']} (2D coords = [{u}, {v}])"]
    for band in a["bands"]:
        tag = "constant" if band["constant"] else "VARIES"
        lines.append(f"### {a['section_axis']} {band['from']} .. {band['to']} ({tag})")
        if "note" in band:
            lines.append(f"- note: {band['note']}")
        for o in band["outlines"]:
            lines.append(f"- outer: {shape_text(o['outer'])}")
            lines += [f"  - hole: {shape_text(hole)}" for hole in o["holes"]]

    if a["circle_features"]:
        lines += ["", f"## Cylindrical features along {a['section_axis']}"]
        lines += [f"- {c['role']} d={c['d']} at [{u},{v}]={c['center']} from {c['from']} to {c['to']} "
                  f"({c['segments']} segments)" for c in a["circle_features"]]
    if a["revolve"]:
        r = a["revolve"]
        lines += ["", "## Revolved part candidate",
                  f"- axis {a['section_axis']} through [{u},{v}]={r['axis_center']}",
                  "- half-profiles as [radius, axial] for rotate_extrude():"]
        lines += [f"  - {p}" for p in r["profiles_r_axial"]]
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("stl")
    parser.add_argument("--axis", choices=AXES, default="z", help="section axis (default z)")
    parser.add_argument("--levels", default="", help="extra comma-separated band edges along --axis")
    parser.add_argument("--tol", type=float, default=0.02, help="geometric tolerance in model units")
    parser.add_argument("--max-vertices", type=int, default=64, help="max polygon vertices to list")
    parser.add_argument("--json", help="also write the full analysis as JSON to this path")
    args = parser.parse_args()

    extra = [float(v) for v in args.levels.split(",") if v.strip()]
    mesh = load_mesh(args.stl)
    result = analyze(mesh, args.axis, extra, args.tol, args.max_vertices)
    if args.json:
        with open(args.json, "w") as fh:
            json.dump(result, fh, indent=1)
    sys.stdout.write(report(args.stl, result))


if __name__ == "__main__":
    main()
