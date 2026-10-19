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

Also repairs files that are still raw UTF-16 LE on disk (with BOM or NULs).

Usage:
    python fix-utf16-byteswap.py [PATH ...]           # report only
    python fix-utf16-byteswap.py [PATH ...] --apply   # rewrite in place
    python fix-utf16-byteswap.py [PATH ...] --apply --backup
"""

from __future__ import annotations

import argparse
import ast
import string
import sys
from pathlib import Path

SKIP_DIRS = frozenset(
    {
        ".git",
        ".hg",
        ".svn",
        "node_modules",
        "__pycache__",
        ".venv",
        "venv",
        ".mypy_cache",
        ".uv",
        "uv",
        "dist",
        "build",
        ".next",
    }
)
# Byte-order marks land on these after the swap; they are not part of the payload.
BOM_CHARS = "\ufeff\ufffe"
PLAIN_CHARS = frozenset(string.printable)
# Recovered source should be overwhelmingly plain ASCII; a stray accent or em
# dash in a comment is fine, wholesale garbage is not.
RECOVERY_THRESHOLD = 0.9
# Above this, the file already reads as ordinary text and needs no repair.
HEALTHY_THRESHOLD = 0.5
TEXT_SUFFIXES = frozenset(
    {
        ".py",
        ".pyi",
        ".toml",
        ".ini",
        ".cfg",
        ".json",
        ".yml",
        ".yaml",
        ".md",
        ".txt",
        ".env",
        ".bat",
        ".ps1",
        ".sh",
        ".js",
        ".ts",
        ".tsx",
        ".css",
        ".html",
        ".sql",
    }
)


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


def recover_swapped_utf8(text: str) -> tuple[str | None, float]:
    """Return (repaired text, confidence) for a UTF-8 file with swapped codepoints."""
    payload = text.lstrip(BOM_CHARS)
    if not payload or plain_ratio(payload) > HEALTHY_THRESHOLD:
        return None, 0.0
    swapped = byteswap(payload)
    if swapped is None:
        return None, 0.0
    return swapped, plain_ratio(swapped)


def looks_like_utf16_le(raw: bytes) -> bool:
    """Heuristic: UTF-16 LE BOM, or many NUL bytes in odd positions (ASCII text)."""
    if raw.startswith(b"\xff\xfe"):
        return True
    if len(raw) < 8 or len(raw) % 2 != 0:
        return False
    # Sample: for ASCII-heavy UTF-16LE, odd bytes are often 0x00.
    sample = raw[: min(len(raw), 400)]
    odd_nuls = sum(1 for i in range(1, len(sample), 2) if sample[i] == 0)
    return odd_nuls / (len(sample) // 2) >= 0.7


def recover_raw_utf16(raw: bytes) -> tuple[str | None, float]:
    """Decode raw UTF-16 LE/BE bytes to a UTF-8 string."""
    if not looks_like_utf16_le(raw) and not raw.startswith(b"\xfe\xff"):
        return None, 0.0
    for enc in ("utf-16", "utf-16-le", "utf-16-be"):
        try:
            text = raw.decode(enc)
        except UnicodeDecodeError:
            continue
        text = text.lstrip(BOM_CHARS)
        conf = plain_ratio(text)
        if conf >= RECOVERY_THRESHOLD:
            return text, conf
    return None, 0.0


def iter_files(paths: list[Path]) -> list[Path]:
    found: list[Path] = []
    for path in paths:
        if path.is_file():
            found.append(path)
            continue
        if not path.exists():
            print(f"missing  {path}", file=sys.stderr)
            continue
        for child in sorted(path.rglob("*")):
            if not child.is_file():
                continue
            if SKIP_DIRS.intersection(child.parts):
                continue
            if child.suffix.lower() not in TEXT_SUFFIXES and child.name not in {
                "Dockerfile",
                "Makefile",
                ".env",
                ".gitignore",
            }:
                continue
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
            raw = path.read_bytes()
        except OSError as exc:
            print(f"skip     {path}: {exc}")
            continue

        repaired: str | None = None
        confidence = 0.0

        raw_text, raw_conf = recover_raw_utf16(raw)
        if raw_text is not None and raw_conf >= RECOVERY_THRESHOLD:
            repaired, confidence = raw_text, raw_conf
        else:
            try:
                text = raw.decode("utf-8")
            except UnicodeDecodeError:
                continue
            repaired, confidence = recover_swapped_utf8(text)

        if repaired is None:
            continue
        if confidence >= RECOVERY_THRESHOLD:
            repairable.append((path, repaired))
        elif confidence > HEALTHY_THRESHOLD:
            unclear.append((path, confidence))

    for path, confidence in unclear:
        print(
            f"unclear  {path} (byteswap is only {confidence:.0%} plain text) -- check by hand"
        )

    if not repairable:
        print("No byte-swapped / UTF-16 files found.")
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
