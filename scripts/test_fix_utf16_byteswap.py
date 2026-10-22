#!/usr/bin/env python3
"""Self-test for fix-utf16-byteswap.py against the known ∀ corruption pattern."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location(
    "fix_utf16_byteswap", ROOT / "fix-utf16-byteswap.py"
)
mod = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(mod)


class FixUtf16Tests(unittest.TestCase):
    def test_recover_user_error_pattern(self) -> None:
        original = '"""Effective quant strategy parameters: DB overrides.\n\nfrom __future__ import annotations\n'
        mangled = original.encode("utf-16-le").decode("utf-16-be")
        self.assertTrue(mangled.startswith("∀∀∀"))
        repaired, conf = mod.recover_swapped_utf8(mangled)
        self.assertIsNotNone(repaired)
        self.assertGreaterEqual(conf, 0.9)
        assert repaired is not None
        self.assertEqual(repaired, original)

    def test_raw_utf16_le_file(self) -> None:
        original = "from app.core.config import settings\n"
        raw = original.encode("utf-16-le")
        # Add BOM
        raw = b"\xff\xfe" + raw
        repaired, conf = mod.recover_raw_utf16(raw)
        self.assertIsNotNone(repaired)
        self.assertGreaterEqual(conf, 0.9)
        assert repaired is not None
        self.assertEqual(repaired.strip(), original.strip())

    def test_apply_roundtrip(self) -> None:
        original = (
            '"""Effective quant strategy parameters."""\n'
            "from dataclasses import dataclass\n"
            "\n"
            "@dataclass(frozen=True)\n"
            "class StrategyParams:\n"
            "    fast_window: int\n"
        )
        mangled = original.encode("utf-16-le").decode("utf-16-be")
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "strategy_config.py"
            path.write_text(mangled, encoding="utf-8")
            rc = mod.main([str(path), "--apply", "--backup"])
            self.assertEqual(rc, 0)
            self.assertEqual(path.read_text(encoding="utf-8"), original)
            self.assertTrue(path.with_suffix(".py.bak").exists())


if __name__ == "__main__":
    unittest.main()
