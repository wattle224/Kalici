/**
 * Standalone Coinbase connectivity check (no Next.js required).
 * Usage: node backend/coinbase-check.mjs
 */
const EXCHANGE = "https://api.exchange.coinbase.com";
const SPOT = "https://api.coinbase.com";
const PRODUCTS = (process.env.COINBASE_PRODUCTS || "XRP-USD,ETH-USD,BTC-USD").split(",");

async function ticker(product) {
  try {
    const res = await fetch(`${EXCHANGE}/products/${product}/ticker`);
    if (!res.ok) throw new Error(`exchange HTTP ${res.status}`);
    const data = await res.json();
    const price = Number(data.price);
    if (!Number.isFinite(price) || price <= 0) throw new Error("bad price");
    return { symbol: product, price, source: "exchange", time: data.time || null };
  } catch {
    const [base, quote] = product.split("-");
    const res = await fetch(`${SPOT}/v2/prices/${base}-${quote}/spot`);
    if (!res.ok) throw new Error(`spot HTTP ${res.status}`);
    const data = await res.json();
    const price = Number(data?.data?.amount);
    if (!Number.isFinite(price) || price <= 0) throw new Error("bad spot");
    return { symbol: product, price, source: "spot", time: new Date().toISOString() };
  }
}

const started = Date.now();
const results = [];
const errors = [];

for (const product of PRODUCTS.map((p) => p.trim()).filter(Boolean)) {
  try {
    results.push(await ticker(product));
  } catch (err) {
    errors.push(`${product}: ${err.message || err}`);
  }
}

const out = {
  ok: results.length > 0,
  connected: results.length > 0,
  service: "coinbase",
  latencyMs: Date.now() - started,
  products: results,
  error: errors.length ? errors.join("; ") : undefined,
};

console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
