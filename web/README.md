# QuantEdge Terminal (Investment Management front end)

Polished multi-workspace trading terminal wired to the local IAM ledger (port **8000**) and Coinbase public market data.

## Workspaces

1. **Trading & Analysis** — security selector, live Coinbase candles/depth for crypto, simulated order ticket, watchlists  
2. **Technical Support & Monitoring** — simulated SRE/ops console (health, inventory, incidents, dry-run controls, AI assist)  
3. **Risk & Regime Analysis** — simulated portfolio risk, heatmaps, illustrative regimes, scenarios, limits  

## Run

From repo root (starts ledger + this UI):

```bat
Investment-Management.bat
```

Or web only:

```bash
cd web
npm install
npm run dev
```

Open http://127.0.0.1:3000/

Legacy dashboard: http://127.0.0.1:3000/legacy

## What is live vs simulated

| Data | Status |
|------|--------|
| Coinbase crypto tickers / candles / depth | **Live** (public Exchange API via `/api/coinbase`) |
| IAM ledger orders on `/legacy` | Local ledger API |
| Equities, FX, futures, bonds in universe | **Simulated** sample instruments |
| Order ticket fills | **Simulated** only — no live brokerage |
| Support/ops metrics & incidents | **Simulated** |
| VaR / ES / regimes | **Illustrative** — methodology shown in UI |

Never treat simulated panels as live market or production risk output.

## Provider architecture

See `lib/quantedge/providers.ts` and `lib/quantedge/types.ts`. Swap market-data vendors behind the provider interface without rewriting workspace UI.

## Keyboard

- `Ctrl/Cmd+K` — command palette (instruments + workspaces)
