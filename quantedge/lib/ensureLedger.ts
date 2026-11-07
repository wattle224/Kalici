/**
 * Start the deposit ledger on :8000 from the Next.js process.
 * On Windows, opens a visible KEEP OPEN window (hidden detached spawns die).
 */
import {
  existsSync,
  mkdirSync,
  appendFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type EnsureResult = {
  ok: boolean;
  already?: boolean;
  method?: string;
  error?: string;
  logPath?: string;
  root?: string;
};

function repoRoot(): string {
  const cwd = process.cwd();
  if (existsSync(join(cwd, "backend", "server.mjs"))) return cwd;
  if (existsSync(join(cwd, "..", "backend", "server.mjs"))) {
    return join(cwd, "..");
  }
  if (existsSync(join(cwd, "backend", "server.ts"))) return cwd;
  return join(cwd, "..");
}

export async function ledgerHealthy(
  timeoutMs = 1500
): Promise<boolean> {
  try {
    const res = await fetch("http://127.0.0.1:8000/health", {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function logLine(logPath: string, line: string) {
  try {
    appendFileSync(logPath, `[${new Date().toISOString()}] ${line}\n`);
  } catch {
    /* ignore */
  }
}

/** Free whatever is LISTENING on :8000 (Windows + Unix). */
async function freePort8000(logPath: string): Promise<void> {
  try {
    if (process.platform === "win32") {
      await execFileAsync(
        "cmd.exe",
        [
          "/c",
          'for /f "tokens=5" %P in (\'netstat -ano ^| findstr ":8000 " ^| findstr LISTENING\') do taskkill /F /PID %P',
        ],
        { windowsHide: true }
      );
    } else {
      await execFileAsync(
        "bash",
        [
          "-lc",
          "pids=$(ss -lptn 'sport = :8000' | grep -oP 'pid=\\K[0-9]+' | sort -u); for p in $pids; do kill -9 $p 2>/dev/null || true; done",
        ]
      );
    }
    logLine(logPath, "freed port 8000");
  } catch (e) {
    logLine(
      logPath,
      `free port note: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

function spawnVisibleWindows(root: string, logPath: string): boolean {
  const mjs = join(root, "backend", "server.mjs");
  const bat = join(root, "Start-Ledger.bat");

  // Prefer Start-Ledger.bat so the user sees the same window as a double-click.
  // `start "" file.bat` — empty title avoids cmd treating the title as the command.
  if (existsSync(bat)) {
    const child = spawn("cmd.exe", ["/c", "start", '""', bat], {
      cwd: root,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
    logLine(logPath, `spawned Start-Ledger.bat via start (pid ${child.pid})`);
    return true;
  }

  if (existsSync(mjs)) {
    const child = spawn(
      "cmd.exe",
      [
        "/c",
        'start "Kalici Ledger API :8000 - KEEP OPEN" /D "' +
          root +
          '" cmd /k node backend\\server.mjs',
      ],
      {
        cwd: root,
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      }
    );
    child.unref();
    logLine(logPath, `spawned visible node server.mjs`);
    return true;
  }

  return false;
}

function spawnBackground(root: string, logPath: string): boolean {
  const mjs = join(root, "backend", "server.mjs");
  if (!existsSync(mjs)) {
    logLine(logPath, `missing ${mjs}`);
    return false;
  }

  const out = join(root, "backend", "data", "ledger-spawn.log");
  try {
    mkdirSync(join(root, "backend", "data"), { recursive: true });
    writeFileSync(out, "");
  } catch {
    /* ignore */
  }

  const child = spawn(process.execPath, [mjs], {
    cwd: root,
    detached: true,
    stdio: ["ignore", "ignore", "ignore"],
    env: { ...process.env, LEDGER_PORT: "8000", LEDGER_HOST: "127.0.0.1" },
    windowsHide: process.platform === "win32" ? false : undefined,
  });
  child.on("error", (err) => logLine(logPath, `spawn error: ${err.message}`));
  child.unref();
  logLine(logPath, `background spawn node ${mjs} pid=${child.pid}`);
  return true;
}

let starting: Promise<EnsureResult> | null = null;

export async function ensureLedgerRunning(): Promise<EnsureResult> {
  const root = repoRoot();
  const logPath = join(root, "quantedge-ledger-start.log");
  try {
    writeFileSync(
      logPath,
      `ensureLedgerRunning ${new Date().toISOString()} root=${root}\n`
    );
  } catch {
    /* ignore */
  }

  if (await ledgerHealthy()) {
    return { ok: true, already: true, method: "existing", logPath, root };
  }

  if (starting) return starting;

  starting = (async (): Promise<EnsureResult> => {
    await freePort8000(logPath);
    await new Promise((r) => setTimeout(r, 400));

    let method = "none";
    if (process.platform === "win32") {
      if (spawnVisibleWindows(root, logPath)) method = "windows-start";
      else if (spawnBackground(root, logPath)) method = "background";
    } else {
      if (spawnBackground(root, logPath)) method = "background";
    }

    if (method === "none") {
      return {
        ok: false,
        error:
          "backend/server.mjs not found. Open the Kalici repo and run Start-Ledger.bat.",
        logPath,
        root,
      };
    }

    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 300));
      if (await ledgerHealthy()) {
        logLine(logPath, `healthy via ${method} after ${i * 300}ms`);
        return { ok: true, method, logPath, root };
      }
    }

    // Last resort: background spawn again (in case start window was blocked)
    spawnBackground(root, logPath);
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 300));
      if (await ledgerHealthy()) {
        logLine(logPath, `healthy via background-retry`);
        return { ok: true, method: "background-retry", logPath, root };
      }
    }

    logLine(logPath, "FAILED — ledger never answered /health");
    return {
      ok: false,
      error:
        "Ledger did not start on :8000. Double-click Start-Ledger.bat in the Kalici repo and keep that black window open.",
      logPath,
      root,
      method,
    };
  })().finally(() => {
    starting = null;
  });

  return starting;
}
