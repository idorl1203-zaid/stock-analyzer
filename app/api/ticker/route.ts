import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

interface Tick { symbol: string; price: number | null; changePercent: number | null; }

// Module-level cache survives Yahoo throttling windows between requests.
const cache = new Map<string, { price: number | null; changePercent: number | null; ts: number }>();
const FRESH_MS = 30_000;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function nasdaqQuote(symbol: string): Promise<Tick | null> {
  try {
    const res = await fetch(`https://api.nasdaq.com/api/quote/${symbol}/info?assetclass=stocks`, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const json = await res.json();
    const p = json?.data?.primaryData;
    if (!p) return null;
    const price = parseFloat((p.lastSalePrice || '').replace(/[^0-9.-]/g, ''));
    const pct = parseFloat((p.percentageChange || '').replace(/[^0-9.-]/g, ''));
    if (isNaN(price)) return null;
    return { symbol, price, changePercent: isNaN(pct) ? null : pct };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('symbols') || '';
  const symbols = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 20);
  if (symbols.length === 0) return NextResponse.json({ ticks: [] });

  const now = Date.now();
  const result = new Map<string, Tick>();

  // 1) Serve fresh cache immediately
  const missing: string[] = [];
  for (const s of symbols) {
    const c = cache.get(s);
    if (c && now - c.ts < FRESH_MS) result.set(s, { symbol: s, price: c.price, changePercent: c.changePercent });
    else missing.push(s);
  }

  // 2) Try one batched Yahoo call for the missing ones
  if (missing.length > 0) {
    try {
      const quotes = await yahooFinance.quote(missing);
      const list = Array.isArray(quotes) ? quotes : [quotes];
      for (const q of list) {
        if (!q?.symbol) continue;
        const tick: Tick = { symbol: q.symbol, price: q.regularMarketPrice ?? null, changePercent: q.regularMarketChangePercent ?? null };
        result.set(q.symbol, tick);
        cache.set(q.symbol, { price: tick.price, changePercent: tick.changePercent, ts: now });
      }
    } catch {
      // Yahoo throttled — fall through to Nasdaq
    }
  }

  // 3) Nasdaq fallback for anything still missing
  const stillMissing = symbols.filter(s => !result.has(s));
  if (stillMissing.length > 0) {
    const fetched = await Promise.all(stillMissing.map(nasdaqQuote));
    fetched.forEach((t, i) => {
      const sym = stillMissing[i];
      if (t) { result.set(sym, t); cache.set(sym, { price: t.price, changePercent: t.changePercent, ts: now }); }
      else {
        const stale = cache.get(sym); // last-resort: stale cache
        if (stale) result.set(sym, { symbol: sym, price: stale.price, changePercent: stale.changePercent });
      }
    });
  }

  const ticks = symbols.map(s => result.get(s)).filter(Boolean);
  return NextResponse.json({ ticks });
}
