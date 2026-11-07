# QUANTEDGE — Global Financial & System Intelligence Terminal

An institutional-feel futuristic terminal built with Next.js 14 + React Three
Fiber. Three workspaces share a top navigation bar, status bar, global ticker
and a persistent instrument / notification state.

## Workspaces

1. **Global Market Intelligence** (`/`) — a rotating 3D financial globe built
   from ~2,400 fibonacci-distributed points, with the nine major financial
   centres as interactive nodes connected by animated capital-flow arcs.
   Alongside it a 3D intelligence cube with six analytical faces (market data,
   order flow, portfolio, quant, AI, risk). Side panels: sentiment, gainers,
   losers, exchange sessions, major indices, crypto, significant events, and a
   sector/region heatmap. Clicking a globe node repopulates the region dossier.
2. **Trading & Portfolio Analysis** (`/trading`) — universal instrument search
   (ticker / name / ISIN / exchange / asset class), interactive canvas-rendered
   candlestick chart with SMA20, SMA50, support/resistance, volume profile,
   RSI14 subplot, and up to four peer overlays. Live L2 order book, recent
   trades, portfolio positions and open/historical orders, plus an
   evidence-citing AI research analyst.
3. **System Intelligence & Monitoring** (`/system`) — reskinned infrastructure
   cube (application health, OMS, execution, market data, data/messaging,
   reporting), D3 force-directed service dependency graph with animated data
   flows, operational snapshot strip, incident & deployment feeds, service
   dossier with CPU/latency/RPS sparklines, and an AI SRE assistant that
   correlates metrics, logs, traces and Confluence runbooks (simulated).

## Shared chrome

- Top bar — workspace switcher, selected instrument, feed latency, notification
  counters, UTC clock.
- Status bar — workspace, selected centre / instrument / cube face, VaR,
  orders, CPU/MEM/NET.
- Bottom ticker — right-to-left tape of equities, crypto, indices, volume
  alerts and incidents, filterable by category.

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- `@react-three/fiber` + `@react-three/drei` + `three` for the globe and cube
- `d3-force` + custom SVG for the service dependency map
- Zustand for shared cross-workspace state
- Tailwind CSS with a crimson / salmon / near-black palette and monospaced
  typography

## Data

All data is clearly simulated (see the `SIMULATED DATA` strip on each
workspace). Live feeds can be wired in via replaceable providers in
`app/data/*` and `app/lib/*`; no credentials are embedded in the client.

## Run

```bash
cd quantedge
npm install
npm run dev   # http://127.0.0.1:3100
npm run build
npm start
```

Dev server is on port **3100** so it doesn't conflict with the existing
Kalici web dashboard on `3000` or the ledger API on `8000`.
