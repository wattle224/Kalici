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

## Operating mode

Header toggle **Simulated | Production** (persisted in `localStorage`):

| Mode | Market data | Orders |
|------|-------------|--------|
| **Production** | Live Coinbase USD quotes/candles/depth; portfolio panel | Paper fills against live marks (no live brokerage) |
| **Simulated** | Sample multi-asset + Coinbase when reachable | Fully simulated |

**Portfolio (Production):** Asset / Amount / Price / Value plus **Total buy**, **Total sell**, and **Total = buy − sell**.  
With `COINBASE_API_KEY` + `SECRET` + `PASSPHRASE` in `web/.env.local`, balances come from your Coinbase Exchange account. Without keys, the panel uses IAM ledger positions + live marks and ledger fill totals.

Never labels simulated/paper fills as live brokerage.

## Keyboard

- `Ctrl/Cmd+K` — command palette (instruments + workspaces)

## QuantEdge UI notes

- **Security dropdown** loads the Coinbase Exchange USD product catalog via `/api/coinbase/products`.
- **Charts / depth** load from `/api/coinbase/market` (live public Exchange API).
- **Support → Fix with Cursor** builds a Cloud Agent prompt, copies it, opens https://cursor.com/agents, then applies pasted replies as dry-run checklist/status updates.
- **Risk → Run analysis tool** uses the local QuantEdge analyzer on live candles; set `GEMINI_API_KEY` (Google AI Studio free tier) for optional Gemini narrative.

## Optional env

See `.env.example` for `GEMINI_API_KEY` / `GOOGLE_AI_API_KEY` (server-side only).
