import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import { auth } from '@clerk/nextjs/server';
import { rateLimit, dbConfigured } from '@/lib/usageDb';

const TD_KEY = process.env.TWELVEDATA_API_KEY;

interface StockData {
  symbol: string; price: number; change: number | null; changePercent: number | null;
  volume: number | null; marketCap: number | null; high52w: number | null;
  low52w: number | null; name: string; currency: string;
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && isFinite(n) ? n : null;
};

// Primary: Twelve Data — reliable, keyed, not rate-blocked like Yahoo.
async function fromTwelveData(symbol: string): Promise<StockData | null> {
  if (!TD_KEY) return null;
  try {
    const res = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${TD_KEY}`);
    if (!res.ok) return null;
    const j = await res.json();
    const price = num(j?.close);
    if (j?.status === 'error' || price === null) return null;
    return {
      symbol: j.symbol || symbol,
      price,
      change: num(j.change),
      changePercent: num(j.percent_change),
      volume: num(j.volume),
      marketCap: null,
      high52w: num(j.fifty_two_week?.high),
      low52w: num(j.fifty_two_week?.low),
      name: j.name || symbol,
      currency: j.currency || 'USD',
    };
  } catch { return null; }
}

async function fromYahoo(symbol: string): Promise<StockData | null> {
  try {
    const q = await yahooFinance.quote(symbol);
    const price = num(q?.regularMarketPrice);
    if (price === null) return null;
    return {
      symbol: q.symbol || symbol,
      price,
      change: num(q.regularMarketChange),
      changePercent: num(q.regularMarketChangePercent),
      volume: num(q.regularMarketVolume),
      marketCap: num(q.marketCap),
      high52w: num(q.fiftyTwoWeekHigh),
      low52w: num(q.fiftyTwoWeekLow),
      name: q.longName || q.shortName || symbol,
      currency: q.currency || 'USD',
    };
  } catch { return null; }
}

async function fromNasdaq(symbol: string): Promise<StockData | null> {
  try {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const res = await fetch(`https://api.nasdaq.com/api/quote/${symbol}/info?assetclass=stocks`, { headers: { 'User-Agent': userAgent } });
    if (!res.ok) return null;
    const json = await res.json();
    const p = json?.data?.primaryData;
    if (!p) return null;
    const price = num((p.lastSalePrice || '').replace(/[^0-9.-]/g, ''));
    if (price === null) return null;
    return {
      symbol: symbol,
      price,
      change: num((p.netChange || '').replace(/[^0-9.-]/g, '')),
      changePercent: num((p.percentageChange || '').replace(/[^0-9.-]/g, '')),
      volume: num((p.volume || '').replace(/[^0-9]/g, '')),
      marketCap: null,
      high52w: null,
      low52w: null,
      name: json.data.companyName || symbol,
      currency: 'USD',
    };
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('symbol');

  // Strict whitelist: tickers are A-Z/0-9/./-, max 12 chars.
  const cleanSymbol = (raw || '').toUpperCase().replace(/[^A-Z0-9.\-]/g, '').slice(0, 12);
  if (!cleanSymbol) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
  }

  if (dbConfigured()) {
    const { userId } = await auth();
    if (userId && !(await rateLimit(userId, 'stock', 60, 60))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  }

  // Try reliable sources in order. NEVER fabricate a price — a wrong "current
  // price" poisons the whole AI analysis (it's the ground-truth anchor). If every
  // source fails, return null and let the analysis infer from the chart honestly.
  const stockData =
    (await fromTwelveData(cleanSymbol)) ||
    (await fromYahoo(cleanSymbol)) ||
    (await fromNasdaq(cleanSymbol));

  if (!stockData) {
    console.error('Stock API: all sources failed for', cleanSymbol);
    return NextResponse.json({ stockData: null });
  }
  return NextResponse.json({ stockData });
}
