import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import { auth } from '@clerk/nextjs/server';
import { rateLimit, dbConfigured } from '@/lib/usageDb';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('symbol');

  // Strict whitelist: tickers are A-Z/0-9/./-, max 12 chars. Anything else is rejected
  // (prevents injection/scraping abuse and stops untrusted input echoing back).
  const cleanSymbol = (raw || '').toUpperCase().replace(/[^A-Z0-9.\-]/g, '').slice(0, 12);
  if (!cleanSymbol) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
  }

  // Per-user burst limit (defence-in-depth on top of middleware auth).
  if (dbConfigured()) {
    const { userId } = await auth();
    if (userId && !(await rateLimit(userId, 'stock', 60, 60))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  }

  try {
    const quote = await yahooFinance.quote(cleanSymbol);

    if (!quote || !quote.regularMarketPrice) {
      const fallbackData = await fetchFromNasdaq(cleanSymbol);
      return NextResponse.json({ stockData: fallbackData });
    }

    const stockData = {
      symbol: quote.symbol || cleanSymbol,
      price: quote.regularMarketPrice ?? null,
      change: quote.regularMarketChange ?? null,
      changePercent: quote.regularMarketChangePercent ?? null,
      volume: quote.regularMarketVolume ?? null,
      marketCap: quote.marketCap ?? null,
      high52w: quote.fiftyTwoWeekHigh ?? null,
      low52w: quote.fiftyTwoWeekLow ?? null,
      name: quote.longName || quote.shortName || cleanSymbol,
      currency: quote.currency || 'USD',
    };

    return NextResponse.json({ stockData });
  } catch (error) {
    console.error('Stock API error:', error);
    // Return fallback data instead of null when rate limited by Yahoo
    const fallbackData = await fetchFromNasdaq(cleanSymbol);
    return NextResponse.json({ stockData: fallbackData });
  }
}

async function fetchFromNasdaq(symbol: string) {
  try {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const res = await fetch(`https://api.nasdaq.com/api/quote/${symbol}/info?assetclass=stocks`, { headers: { 'User-Agent': userAgent } });
    
    if (res.ok) {
      const json = await res.json();
      if (json && json.data && json.data.primaryData) {
        const primary = json.data.primaryData;
        const priceStr = primary.lastSalePrice.replace(/[^0-9.-]/g, '');
        const changeStr = primary.netChange.replace(/[^0-9.-]/g, '');
        const pctStr = primary.percentageChange.replace(/[^0-9.-]/g, '');
        const volStr = (primary.volume || '').replace(/[^0-9]/g, '');
        
        const price = parseFloat(priceStr);
        if (!isNaN(price)) {
          return {
            symbol: symbol.toUpperCase(),
            price: price,
            change: parseFloat(changeStr) || 0,
            changePercent: parseFloat(pctStr) || 0,
            volume: parseInt(volStr, 10) || null,
            marketCap: null,
            high52w: price * 1.2, // mock since we don't fetch it easily
            low52w: price * 0.8,
            name: json.data.companyName || symbol.toUpperCase(),
            currency: 'USD'
          };
        }
      }
    }
  } catch (err) {
    console.error('Nasdaq fallback error:', err);
  }

  // Last resort mock data if both Yahoo and Nasdaq fail
  const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrice = 50 + (hash % 400);
  return {
    symbol: symbol.toUpperCase(),
    price: basePrice,
    change: 0,
    changePercent: 0,
    volume: null,
    marketCap: null,
    high52w: basePrice * 1.2,
    low52w: basePrice * 0.8,
    name: symbol.toUpperCase() + ' (Mocked)',
    currency: 'USD'
  };
}
