# Investment Management

**One app. One shortcut. One URL.**

| | |
|---|---|
| **Start** | Double-click **`Investment-Management.bat`** |
| **Desktop** | Shortcut named **Investment Management** |
| **Open** | http://127.0.0.1:3000/ |
| **API** | http://127.0.0.1:8000/health |

Keep the two black windows open while you use the app.

---

## First-time setup (Windows)

1. Download / clone this repo, **or** double-click **`MERGE-INTO-ONE.bat`** to install to `Desktop\Investment Management`.
2. Double-click **`Investment-Management.bat`** (or the Desktop shortcut).
3. Accept Node.js install if asked.
4. Browser opens http://127.0.0.1:3000/ — hard refresh with **Ctrl+F5** if needed.

That single launcher:

- installs Node if missing  
- starts the ledger (port **8000**)  
- starts the web UI (port **3000**) using `npm.cmd` (avoids PowerShell script blocks)  
- creates **one** Desktop shortcut  
- opens Coinbase-backed price + depth charts  

---

## Stop using these (they cause confusion)

- `C:\Users\User\projects\Investment Management` (old Python stack)  
- OneDrive `Launch-Investment-Management.bat` pointing at that old folder  
- Extra shortcuts: Kalici, GET-IAM-NOW, START-IAM, etc.

After merge, only use:

**Desktop → Investment Management**

---

## What you get in the UI

- Live **Coinbase** prices, price chart, and depth chart  
- XRP-USD order history / execution ONLINE·OFFLINE  
- Clean restart, refresh, Test Coinbase  

---

## Optional / advanced

| File | When to use |
|------|-------------|
| `FIX-UTF16.bat` | Only if an **old Python** file shows `SyntaxError: ∀` |
| `DIAGNOSE-PORTS.bat` | Check what is on ports 3000 / 8000 |
| `ATLAS/` | Separate iOS app (Xcode) — not required for Windows |

---

## Manual start (developers)

```bash
npm run ledger          # :8000
cd web && npm install && npm run dev   # :3000
npm run coinbase        # connectivity check
```
