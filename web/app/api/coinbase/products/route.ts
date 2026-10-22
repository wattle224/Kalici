import { NextResponse } from "next/server";
import { listCoinbaseUsdProducts } from "@/lib/coinbase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const products = await listCoinbaseUsdProducts();
    return NextResponse.json(
      {
        ok: true,
        count: products.length,
        products,
        source: "coinbase-exchange",
        freshness: "live",
        fetchedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        count: 0,
        products: [],
        error: err instanceof Error ? err.message : String(err),
        fetchedAt: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
