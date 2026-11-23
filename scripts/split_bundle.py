#!/usr/bin/env python3
"""Split the starter bundle markdown into its constituent files.

Usage: split_bundle.py BUNDLE OUTDIR

A line matching FILE_RE, immediately followed by a fence line (three or more
backticks, optional language), starts a file. The body runs to the closing
fence, which must use the same number of backticks as the opening one.
Paths under SKIP_PREFIXES are not written (evals live in filings-kb).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

FILE_RE = re.compile(r"^[\w./\[\]-]+\.(tsx?|astro|mjs|json|md|py|css|js)$")
FENCE_RE = re.compile(r"^(`{3,})[\w-]*$")
SKIP_PREFIXES = ("evals/",)


def split_bundle(bundle: Path, outdir: Path) -> list[Path]:
    """Write each fenced file in `bundle` under `outdir`; return paths written.

    Raises ValueError on an unterminated fence or a path escaping `outdir`.
    """
    lines = bundle.read_text(encoding="utf-8").splitlines()
    written: list[Path] = []
    root = outdir.resolve()
    i = 0
    while i < len(lines) - 1:
        name = lines[i].strip()
        opening = FENCE_RE.match(lines[i + 1].strip())
        if not (FILE_RE.match(name) and opening):
            i += 1
            continue
        fence = opening.group(1)
        body: list[str] = []
        j = i + 2
        while j < len(lines) and lines[j].strip() != fence:
            body.append(lines[j])
            j += 1
        if j >= len(lines):
            raise ValueError(f"unterminated fence for {name} (line {i + 1})")
        i = j + 1
        if name.startswith(SKIP_PREFIXES):
            continue
        target = (root / name).resolve()
        if root not in target.parents:
            raise ValueError(f"path escapes outdir: {name}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("\n".join(body) + "\n", encoding="utf-8")
        written.append(target)
    return written


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    outdir = Path(argv[2])
    for path in split_bundle(Path(argv[1]), outdir):
        print(path.relative_to(outdir.resolve()))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
