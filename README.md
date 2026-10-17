# Investment Management — QuantEdge Terminal

**One app. One shortcut. One URL.**

| | |
|---|---|
| **Start** | Double-click **`Investment-Management.bat`** or **`INSTALL.bat`** |
| **Desktop** | Shortcut named **Investment Management** |
| **Front end** | **QuantEdge Terminal** → http://127.0.0.1:3000/ |
| **API** | http://127.0.0.1:8000/health |
| **Legacy UI** | http://127.0.0.1:3000/legacy |

Keep the two black windows open while you use the app.

### QuantEdge workspaces
1. Trading & Analysis (Coinbase live crypto charts + simulated multi-asset order ticket)
2. Technical Support & Monitoring (simulated SRE/ops console)
3. Risk & Regime Analysis (illustrative risk / regime UI)

See `web/README.md` for live vs simulated data boundaries.

---

## Full install (Windows) — do this once

**PowerShell (copy/paste all of it):**

```powershell
$bat = Join-Path $env:TEMP 'INSTALL-Investment-Management.bat'
Invoke-WebRequest -Uri 'https://github.com/wattle224/Kalici/raw/cursor/quantedge-terminal-ae22/INSTALL.bat' -OutFile $bat
cmd /c $bat
```

Or download **`INSTALL.bat`** and double-click it.

That will:

1. Delete **all** old Desktop / OneDrive Desktop IAM shortcuts  
2. Install to **`Desktop\Investment Management`**  
3. Create **one** new shortcut: **Investment Management**  
4. Start ledger + web UI and open http://127.0.0.1:3000/  

Accept Node.js install if asked. Keep the black windows open. Use **Ctrl+F5** if the page looks cached.

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
