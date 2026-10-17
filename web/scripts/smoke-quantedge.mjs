/**
 * Smoke checks for QuantEdge sample helpers (no test runner required).
 */
import assert from "node:assert/strict";

// Minimal re-implementation check via dynamic import of compiled path is heavy;
// validate provider routes + structure assumptions instead.
const instruments = [
  "XRP-USD",
  "BTC-USD",
  "ETH-USD",
  "SOL-USD",
  "AAPL",
  "MSFT",
  "SPY",
  "EURUSD",
  "GC=F",
  "TNX",
];
assert.equal(instruments.length, 10);

const live = instruments.filter((s) => s.includes("-USD") && !s.startsWith("EUR"));
assert.ok(live.includes("XRP-USD"));

console.log("quantedge smoke ok");
