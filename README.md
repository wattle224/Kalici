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

## Investment Management (Windows desktop)

**Error:** `Ledger data could not be loaded from the API … port 8000` means the **ledger API is not running**.

Use the launcher in the repo root (replace your Desktop shortcut target):

```
C:\path\to\Kalici\Launch-Investment-Management.bat
```

Or right-click your Desktop `Launch-Investment-Management.bat` → **Properties** → set **Target** to the copy inside your cloned `Kalici` folder.

The launcher starts:

1. **Ledger API** — http://127.0.0.1:8000 (`GET /api/ledger`, `GET /health`)
2. **Web UI** — http://127.0.0.1:3000

Keep both console windows open. Verify API: http://127.0.0.1:8000/health

Manual start:

```bash
npm install          # repo root — installs tsx for ledger
npm run ledger       # port 8000
cd web && npm install && npm run dev   # port 3000
```

## Web trading dashboard (port 3000)

Open http://127.0.0.1:3000/ — **XRP-USD** order history table. Header shows `Kalici · XRP-USD · local execution · API :8000` when the ledger API is connected. Use **Clean restart** or `?cleanRestart=1` to reset ledger data.

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

## Notes

This repository previously referenced `InvestmentOps.xcodeproj`. The app has been consolidated under the **ATLAS** name and project.
