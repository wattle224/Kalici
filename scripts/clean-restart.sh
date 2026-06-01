#!/usr/bin/env bash
# Resets local git build artifacts. After pull, rebuild ATLAS in Xcode and use
# Trading → Clean restart to wipe persisted trade ledger on device/simulator.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Cleaning Xcode-derived data paths (if present)..."
rm -rf build DerivedData .swiftpm 2>/dev/null || true

echo "Done. Next steps:"
echo "  1. Open ATLAS.xcodeproj in Xcode"
echo "  2. Product → Clean Build Folder (Shift+Cmd+K)"
echo "  3. Run the app"
echo "  4. Trading tab → Clean restart (or delete app from simulator to clear UserDefaults)"
