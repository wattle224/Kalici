import { listCoinbaseUsdProducts } from "@/lib/coinbase";
import type { Instrument } from "@/lib/quantedge/types";
import AppShell from "./components/quantedge/AppShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadCoinbaseInstruments(): Promise<Instrument[]> {
  try {
    const products = await listCoinbaseUsdProducts();
    return products.map((p) => ({
      id: `cb-${p.id.toLowerCase()}`,
      symbol: p.id,
      name: p.displayName || `${p.baseCurrency} / ${p.quoteCurrency}`,
      exchange: "Coinbase",
      assetClass: "crypto" as const,
      currency: p.quoteCurrency || "USD",
      providerId: p.id,
    }));
  } catch {
    return [];
  }
}

export default async function Home() {
  const initialProducts = await loadCoinbaseInstruments();
  return <AppShell initialProducts={initialProducts} />;
}
