#!/usr/bin/env python3
"""Find the OpenSCAD install to use and report what it is.

$OPENSCAD always wins: a path, or a full command such as
"flatpak run org.openscad.OpenSCAD". Otherwise every candidate found is
version-checked and the newest wins; ties keep this search order:
openscad and openscad-nightly on PATH, OpenSCAD AppImages in ~/Applications
(and one level below), then the Flathub app org.openscad.OpenSCAD.

Run directly to print the report (add --json for machine-readable output).
Exit codes: 0 = OpenSCAD found, 1 = none found.

This file is duplicated in design-scad/ and stl-to-scad/; keep the copies identical.
"""
from __future__ import annotations

import argparse
import functools
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

FLATPAK_ID = "org.openscad.OpenSCAD"


def _run(cmd: list[str], timeout: int = 60) -> tuple[int | None, str]:
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired):
        return None, ""
    return proc.returncode, proc.stdout + proc.stderr


def _version(cmd: list[str]) -> str | None:
    rc, out = _run([*cmd, "--version"])
    match = re.search(r"OpenSCAD version (\S+)", out)
    return match.group(1) if rc == 0 and match else None


def _version_key(version: str) -> tuple[int, ...]:
    return tuple(int(n) for n in re.findall(r"\d+", version))


def _candidates() -> list[list[str]]:
    found, seen = [], set()

    def add(cmd: list[str], path: str) -> None:
        real = os.path.realpath(path)
        if real not in seen:
            seen.add(real)
            found.append(cmd)

    for name in ("openscad", "openscad-nightly"):
        if path := shutil.which(name):
            add([path], path)
    apps = Path.home() / "Applications"
    for path in sorted([*apps.glob("*.AppImage"), *apps.glob("*/*.AppImage")]):
        if "openscad" in path.name.lower() and os.access(path, os.X_OK):
            add([str(path)], str(path))
    if shutil.which("flatpak") and _run(["flatpak", "info", FLATPAK_ID])[0] == 0:
        found.append(["flatpak", "run", FLATPAK_ID])
    return found


@functools.cache
def discover() -> list[dict]:
    """All working installs, the one to use first."""
    env = os.environ.get("OPENSCAD")
    if env:
        cmd = [env] if os.path.exists(env) else shlex.split(env)
        return [{"command": cmd, "version": _version(cmd), "source": "$OPENSCAD"}]
    installs = [{"command": c, "version": v, "source": "auto"}
                for c in _candidates() if (v := _version(c))]
    # sorted() is stable, so equal versions keep the search order
    return sorted(installs, key=lambda i: _version_key(i["version"]), reverse=True)


def find_openscad() -> list[str] | None:
    """Command (argv prefix) to run OpenSCAD, or None if no install was found."""
    installs = discover()
    return installs[0]["command"] if installs else None


def install_kind(cmd: list[str]) -> str:
    if cmd[0] == "flatpak":
        return "flatpak"
    # skip wrappers such as "env VAR=x /path/openscad"
    exe = next((c for c in cmd if "openscad" in os.path.basename(c).lower()), cmd[0])
    path = shutil.which(exe) or exe
    real = os.path.realpath(path)
    if real.lower().endswith(".appimage"):
        return "appimage"
    if path.startswith("/snap/"):
        return "snap"
    for query in (["rpm", "-qf"], ["dpkg", "-S"], ["pacman", "-Qqo"]):
        if shutil.which(query[0]):
            rc, out = _run([*query, real])
            if rc == 0 and out.strip():
                return f"{query[0]} package {out.split(':')[0].strip()}"
    return "binary"


def details(cmd: list[str]) -> dict:
    _, info = _run([*cmd, "--info"])
    user_lib = re.search(r"^User Library Path: (.+)$", info, re.M)
    lib_paths = re.search(r"^OpenSCAD library path:\n((?:[ \t]+\S.*\n?)*)", info, re.M)
    libs = lib_paths.group(1).split() if lib_paths else []
    if user_lib and user_lib.group(1).strip() not in libs:
        libs.insert(0, user_lib.group(1).strip())
    bosl2 = next((str(Path(d) / "BOSL2") for d in libs if (Path(d) / "BOSL2" / "std.scad").is_file()), None)
    return {
        "user_library_path": user_lib.group(1).strip() if user_lib else None,
        "library_paths": libs,
        "bosl2": bosl2,
        "backends": "CGAL, Manifold" if "Manifold version" in info else "CGAL",
    }


def report() -> dict:
    installs = discover()
    if not installs or not installs[0]["version"]:
        return {"found": False, "installs": installs}
    best = installs[0]
    result = {"found": True, **best, "kind": install_kind(best["command"]), **details(best["command"]),
              "others": [{"command": i["command"], "version": i["version"]} for i in installs[1:]],
              "notes": []}
    if _version_key(best["version"]) < (2021, 1):
        result["notes"].append("OpenSCAD older than 2021.01 is not supported by these skills.")
    elif _version_key(best["version"])[0] <= 2021:
        result["notes"].append("2021.01 release: CGAL-only (slow renders), and headless PNG export can abort "
                               "on some Wayland desktops. A development snapshot is recommended: "
                               "https://openscad.org/downloads.html")
    if result["kind"] == "flatpak":
        result["notes"].append("Flatpak sandbox: input, scratch, and output files must be under $HOME.")
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--json", action="store_true", help="print the report as JSON")
    r = report()
    if ap.parse_args().json:
        print(json.dumps(r, indent=2))
    elif not r["found"]:
        bad = r["installs"][0]["command"] if r["installs"] else None
        print(f"OpenSCAD: NOT FOUND{f' ($OPENSCAD={shlex.join(bad)} does not run)' if bad else ''}\n"
              "Install it (https://openscad.org/downloads.html) or set OPENSCAD to its command.")
    else:
        print(f"OpenSCAD command: {shlex.join(r['command'])}  (from {r['source']})")
        print(f"Version: {r['version']}  Install: {r['kind']}  Backends: {r['backends']}")
        print(f"User library path: {r['user_library_path']}")
        print(f"BOSL2: {r['bosl2'] or 'not installed'}")
        for other in r["others"]:
            print(f"Also found: {shlex.join(other['command'])}  ({other['version']})")
        for note in r["notes"]:
            print(f"Note: {note}")
    return 0 if r["found"] else 1


if __name__ == "__main__":
    sys.exit(main())
