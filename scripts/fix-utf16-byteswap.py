#!/usr/bin/env python3
"""Repair source files mangled by a UTF-16 byte-order mixup.

Symptom: the file opens as a wall of CJK/math characters and the interpreter
reports something like `SyntaxError: invalid character '∀' (U+2200)`.

Cause: the file was written as UTF-16LE (every ASCII character followed by a
NUL byte -- what PowerShell's `>`, `Out-File` and `Set-Content` produce by
default), then read back as UTF-16BE. The swap pairs each character with its
own trailing NUL, so every original ASCII byte B ends up stored as codepoint
B << 8: `"` (0x22) becomes U+2200, `E` (0x45) becomes U+4500, newline (0x0A)
becomes U+0A00. Byteswapping the 16-bit code units back is lossless, so the
original text is recoverable exactly.

Usage:
    python3 fix-utf16-byteswap.py [PATH ...]           # report only
    python3 fix-utf16-byteswap.py [PATH ...] --apply   # rewrite in place
"""

from __future__ import annotations

import argparse
import ast
import string
import sys
from pathlib import Path

SKIP_DIRS = frozenset(
    {".git", ".hg", ".svn", "node_modules", "__pycache__", ".venv", "venv", ".mypy_cache"}
)
# Byte-order marks land on these after the swap; they are not part of the payload.
BOM_CHARS = "\ufeff\ufffe"
PLAIN_CHARS = frozenset(string.printable)
# Recovered source should be overwhelmingly plain ASCII; a stray accent or em
# dash in a comment is fine, wholesale garbage is not.
RECOVERY_THRESHOLD = 0.9
# Above this, the file already reads as ordinary text and needs no repair.
HEALTHY_THRESHOLD = 0.5


def plain_ratio(text: str) -> float:
    """Fraction of characters that are printable ASCII or whitespace."""
    if not text:
        return 0.0
    return sum(1 for char in text if char in PLAIN_CHARS) / len(text)


def byteswap(text: str) -> str | None:
    """Swap every 16-bit code unit, or None if the result is not valid text."""
    try:
        return text.encode("utf-16-be").decode("utf-16-le")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return None


def recover(text: str) -> tuple[str | None, float]:
    """Return (repaired text, confidence) for a mangled file.

    Confidence is how plainly ASCII the byteswapped result reads. The repair is
    only offered when the input looks garbled *and* the output looks like source.
    """
    payload = text.lstrip(BOM_CHARS)
    if not payload or plain_ratio(payload) > HEALTHY_THRESHOLD:
        return None, 0.0
    swapped = byteswap(payload)
    if swapped is None:
        return None, 0.0
    return swapped, plain_ratio(swapped)


def iter_files(paths: list[Path]) -> list[Path]:
    found: list[Path] = []
    for path in paths:
        if path.is_file():
            found.append(path)
            continue
        for child in sorted(path.rglob("*")):
            if child.is_file() and not SKIP_DIRS.intersection(child.parts):
                found.append(child)
    return found


def syntax_error(path: Path, text: str) -> str | None:
    """Return a syntax error description for recovered Python, else None."""
    if path.suffix != ".py":
        return None
    try:
        ast.parse(text)
    except SyntaxError as exc:
        return str(exc)
    return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", default=["."], type=Path)
    parser.add_argument("--apply", action="store_true", help="rewrite files in place")
    parser.add_argument("--backup", action="store_true", help="keep a .bak copy")
    args = parser.parse_args(argv)

    repairable: list[tuple[Path, str]] = []
    unclear: list[tuple[Path, float]] = []

    for path in iter_files([Path(p) for p in args.paths]):
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        repaired, confidence = recover(text)
        if repaired is None:
            continue
        if confidence >= RECOVERY_THRESHOLD:
            repairable.append((path, repaired))
        elif confidence > HEALTHY_THRESHOLD:
            unclear.append((path, confidence))

    for path, confidence in unclear:
        print(f"unclear  {path} (byteswap is only {confidence:.0%} plain text) -- check by hand")

    if not repairable:
        print("No byte-swapped files found.")
        return 0

    failures = 0
    for path, repaired in repairable:
        problem = syntax_error(path, repaired)
        if problem:
            print(f"SKIP     {path}: repaired text does not parse ({problem})")
            failures += 1
            continue
        data = repaired.encode("utf-8")
        if args.apply:
            if args.backup:
                path.with_suffix(path.suffix + ".bak").write_bytes(path.read_bytes())
            path.write_bytes(data)
            print(f"fixed    {path} ({len(data)} bytes)")
        else:
            first_line = repaired.splitlines()[0] if repaired.splitlines() else ""
            print(f"corrupt  {path} -- recovered first line: {first_line!r}")

    if not args.apply:
        print(f"\n{len(repairable)} file(s) repairable. Re-run with --apply to write.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
