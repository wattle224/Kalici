# ATLAS

ATLAS is a SwiftUI iOS app for private markets investment operations. It provides a mobile command center for portfolio oversight, capital activity, valuations, and official reporting workflows.

## Features

- **Dashboard** — portfolio NAV, unfunded commitments, and items requiring attention
- **Portfolio** — investment positions with commitment, call, and distribution metrics
- **Capital** — capital calls and distributions with workflow status
- **Trades** — automated execution history with per-fill execution prices (not live quotes)
- **Valuations** — NAV records and approval status by investment
- **Reports** — operational report queue with period and generation metadata

Sample data is included for local development and demos.

## Requirements

- Xcode 15 or later
- iOS 17.0 or later
- macOS for building and running on simulator or device

## Getting started

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
