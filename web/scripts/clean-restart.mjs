import { rmSync } from "node:fs";

rmSync(".next", { recursive: true, force: true });
console.log("Removed .next build cache.");

const api = "http://127.0.0.1:3000/api/trading";
try {
  const res = await fetch(api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "clean-restart" }),
  });
  if (res.ok) {
    const data = await res.json();
    const fills = data.snapshot?.trades?.filter((t) => t.status === "filled")?.length ?? 0;
    console.log(`API clean restart OK — ${fills} seed fills, EXECUTION=${data.snapshot?.executionState}.`);
  } else {
    console.log("Dev server not running — start with: npm run dev");
    console.log("Browser: open http://127.0.0.1:3000/?cleanRestart=1");
  }
} catch {
  console.log("Dev server not running — start with: npm run dev");
  console.log("Browser: open http://127.0.0.1:3000/?cleanRestart=1");
}
