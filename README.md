# ATLAS

ATLAS is a SwiftUI iOS app for private markets investment operations. It provides a mobile command center for portfolio oversight, capital activity, valuations, and official reporting workflows.

## Features

- **Dashboard** — portfolio NAV, unfunded commitments, and items requiring attention
- **Portfolio** — investment positions with commitment, call, and distribution metrics
- **Capital** — capital calls and distributions with workflow status
- **Trading** — execution pause state, open-position unrealized P&L, and trade history (confirmed fills only; skipped intents excluded)
- **Valuations** — NAV records and approval status by investment
- **Reports** — operational report queue with period and generation metadata

Sample data is included for local development and demos.

## Requirements

- Xcode 15 or later
- iOS 17.0 or later
- macOS for building and running on simulator or device

## Web trading dashboard (port 3000)

```bash
cd web
npm install
npm run dev
```

Open http://127.0.0.1:3000/ — trade history fixes apply to **all** symbols (`ETH-USD`, `SKL-USD`, any `*-USD`), not a single pair. Use **Clean restart** to reset persisted ledger data.

**Share feedback** — floating button opens an interactive form. Emails go to `sbarryfr@gmail.com` with subject `[Kalici Trading Feedback] {category} — {preview}`. Copy `web/.env.example` to `web/.env.local` and set Gmail SMTP (app password) for server-side send; otherwise the mail app opens with a pre-filled draft.

## Getting started (iOS)

1. Open `ATLAS.xcodeproj` in Xcode.
2. Select the **ATLAS** scheme and target.
3. Under **Signing & Capabilities**, choose your Team and update the bundle identifier if needed (`com.kalici.atlas` by default).
4. Build and run on a simulator or device.

## Project structure

```
ATLAS/
├── ATLASApp.swift          # App entry point
├── Models/                 # Domain models
├── Services/               # Data store (sample data)
├── Utilities/              # Formatting helpers
└── Views/                  # SwiftUI screens and components
```

## Utility scripts

`scripts/fix-utf16-byteswap.py` repairs source files wrecked by a UTF-16 byte-order
mixup — the failure mode where a file becomes a wall of CJK/math characters and the
interpreter reports `SyntaxError: invalid character '∀' (U+2200)`. It happens when a
file is written as UTF-16LE (PowerShell's `>`, `Out-File` and `Set-Content` all do
this by default) and then read back as UTF-16BE, which leaves every original byte
stored as `byte << 8`. The script is stdlib-only and runs against any project:

```bash
python3 scripts/fix-utf16-byteswap.py path/to/project           # report what is damaged
python3 scripts/fix-utf16-byteswap.py path/to/project --apply   # rewrite in place
```

It defaults to a dry run, only rewrites a file when the repaired text reads as plain
source (and, for `.py` files, actually parses), and supports `--backup` for `.bak`
copies. To stop the corruption recurring, force UTF-8 at the point of writing, e.g.
`Out-File -Encoding utf8` or `Set-Content -Encoding utf8`.

## Notes

This repository previously referenced `InvestmentOps.xcodeproj`. The app has been consolidated under the **ATLAS** name and project.
