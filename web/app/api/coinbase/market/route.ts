import { NextResponse } from "next/server";
import {
  fetchCoinbaseCandles,
  fetchCoinbaseOrderBook,
} from "@/lib/coinbase";
import { ACTIVE_MARKET } from "@/lib/symbols";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const product = (url.searchParams.get("product") || ACTIVE_MARKET).toUpperCase();
  const granularity = Number(url.searchParams.get("granularity") || 3600);
  const candleLimit = Number(url.searchParams.get("limit") || 48);
  const depthLevels = Number(url.searchParams.get("depth") || 20);

  try {
    const [candles, book] = await Promise.all([
      fetchCoinbaseCandles(product, granularity, candleLimit),
      fetchCoinbaseOrderBook(product, depthLevels),
    ]);

    return NextResponse.json(
      {
        ok: true,
        product,
        candles,
        book,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        product,
        candles: [],
        book: null,
        error: err instanceof Error ? err.message : String(err),
        fetchedAt: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
