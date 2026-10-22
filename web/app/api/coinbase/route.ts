import { NextResponse } from "next/server";
import { checkCoinbaseConnection } from "@/lib/coinbase";
import { TRADING_SYMBOLS } from "@/lib/symbols";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const productsParam = url.searchParams.get("products");
  const products = productsParam
    ? productsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [...TRADING_SYMBOLS, "ETH-USD", "BTC-USD"];

  try {
    const status = await checkCoinbaseConnection(products);
    return NextResponse.json(status, {
      status: status.connected ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        connected: false,
        service: "coinbase",
        message: "Coinbase check failed",
        checkedAt: new Date().toISOString(),
        latencyMs: 0,
        products: [],
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 503 }
    );
  }
}
