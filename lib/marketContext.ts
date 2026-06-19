import yahooFinance from 'yahoo-finance2';
import { RSI, MACD, SMA, EMA, ATR, BollingerBands, ADX } from 'technicalindicators';

// Builds a precise "QUANT DATA" block (computed indicators + fundamentals) to feed
// the model alongside the chart image, so it reasons over real numbers instead of
// eyeballing the screenshot. Fully best-effort: any failure returns whatever it has.

interface Candle { high: number; low: number; close: number; volume: number; }

function last<T>(a: T[] | undefined): T | undefined { return a && a.length ? a[a.length - 1] : undefined; }
function f(n: unknown, d = 2): string { return typeof n === 'number' && isFinite(n) ? n.toFixed(d) : 'n/a'; }
function compact(n: unknown): string {
  if (typeof n !== 'number' || !isFinite(n)) return 'n/a';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}

const TD_KEY = process.env.TWELVEDATA_API_KEY;

// Reliable primary source (keyless sources get rate-limited/bot-gated).
async function candlesTwelveData(symbol: string, interval: '1d' | '1wk', size: number): Promise<Candle[]> {
  if (!TD_KEY) return [];
  const iv = interval === '1wk' ? '1week' : '1day';
  const res = await fetch(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${iv}&outputsize=${size}&apikey=${TD_KEY}`);
  if (!res.ok) return [];
  const j = await res.json();
  if (j?.status !== 'ok' || !Array.isArray(j.values)) return [];
  return j.values.slice().reverse() // API returns newest-first
    .map((v: { high: string; low: string; close: string; volume: string }) => ({ high: +v.high, low: +v.low, close: +v.close, volume: +v.volume || 0 }))
    .filter((c: Candle) => isFinite(c.close) && c.close > 0);
}

async function candlesYahoo(symbol: string, interval: '1d' | '1wk', days: number): Promise<Candle[]> {
  const period1 = new Date(Date.now() - days * 86400000);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await yahooFinance.chart(symbol, { period1, interval });
      const out = (res?.quotes || [])
        .filter((q) => q.close != null && q.high != null && q.low != null)
        .map((q) => ({ high: q.high as number, low: q.low as number, close: q.close as number, volume: (q.volume as number) || 0 }));
      if (out.length) return out;
    } catch { /* retry once */ }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 350));
  }
  return [];
}

async function getCandles(symbol: string, interval: '1d' | '1wk', days: number): Promise<Candle[]> {
  const td = await candlesTwelveData(symbol, interval, interval === '1wk' ? 260 : 400).catch(() => []);
  if (td.length >= 30) return td;
  return candlesYahoo(symbol, interval, days);
}

function indicatorLine(label: string, c: Candle[]): string {
  if (c.length < 30) return `${label}: insufficient data`;
  const close = c.map((x) => x.close), high = c.map((x) => x.high), low = c.map((x) => x.low), vol = c.map((x) => x.volume);
  const rsi = last(RSI.calculate({ period: 14, values: close }));
  const macd = last(MACD.calculate({ values: close, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false }));
  const ema20 = last(EMA.calculate({ period: 20, values: close }));
  const ema50 = last(EMA.calculate({ period: 50, values: close }));
  const sma200 = close.length >= 200 ? last(SMA.calculate({ period: 200, values: close })) : undefined;
  const atr = last(ATR.calculate({ period: 14, high, low, close }));
  const bb = last(BollingerBands.calculate({ period: 20, stdDev: 2, values: close }));
  const adx = last(ADX.calculate({ period: 14, high, low, close }));
  const avgVol = vol.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, vol.length);
  const lastVol = last(vol) || 0;
  const volRel = avgVol ? ((lastVol / avgVol - 1) * 100) : 0;

  const macdStr = macd ? `${f(macd.MACD)} (sig ${f(macd.signal)}, hist ${macd.histogram != null && macd.histogram >= 0 ? '+' : ''}${f(macd.histogram)})` : 'n/a';
  const bbStr = bb ? `[lo ${f(bb.lower)} mid ${f(bb.middle)} hi ${f(bb.upper)}]` : 'n/a';
  return `${label}: RSI(14) ${f(rsi, 1)} | MACD ${macdStr} | EMA20 ${f(ema20)} | EMA50 ${f(ema50)} | SMA200 ${f(sma200)} | ATR(14) ${f(atr)} | ADX(14) ${f(adx, 1)} | Bollinger(20,2) ${bbStr} | last vol ${compact(lastVol)} vs 20-avg ${compact(avgVol)} (${volRel >= 0 ? '+' : ''}${volRel.toFixed(0)}%)`;
}

export async function getMarketContext(rawSymbol: string): Promise<string> {
  const symbol = (rawSymbol || '').toUpperCase().replace(/\s/g, '');
  if (!symbol) return '';

  const [dailyR, weeklyR, sumR] = await Promise.allSettled([
    getCandles(symbol, '1d', 420),
    getCandles(symbol, '1wk', 1100),
    yahooFinance.quoteSummary(symbol, { modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData', 'calendarEvents'] }),
  ]);

  const lines: string[] = [];

  if (dailyR.status === 'fulfilled' && dailyR.value.length >= 30) {
    lines.push(indicatorLine('DAILY', dailyR.value));
  }
  if (weeklyR.status === 'fulfilled' && weeklyR.value.length >= 30) {
    lines.push(indicatorLine('WEEKLY', weeklyR.value));
  }

  if (sumR.status === 'fulfilled' && sumR.value) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = sumR.value;
    const fund: string[] = [];
    const pe = s.summaryDetail?.trailingPE, fpe = s.summaryDetail?.forwardPE, eps = s.defaultKeyStatistics?.trailingEps;
    if (pe != null) fund.push(`P/E ${f(pe, 1)}`);
    if (fpe != null) fund.push(`fwd P/E ${f(fpe, 1)}`);
    if (eps != null) fund.push(`EPS ${f(eps)}`);
    const fd = s.financialData;
    if (fd?.targetMeanPrice != null) {
      fund.push(`analyst target mean ${f(fd.targetMeanPrice)} (range ${f(fd.targetLowPrice)}–${f(fd.targetHighPrice)}, n=${fd.numberOfAnalystOpinions ?? '?'})`);
    }
    if (fd?.recommendationKey) fund.push(`consensus ${String(fd.recommendationKey).toUpperCase()}`);
    const ed = s.calendarEvents?.earnings?.earningsDate?.[0];
    if (ed) {
      const d = new Date(ed);
      const days = Math.round((d.getTime() - Date.now()) / 86400000);
      fund.push(`next earnings ${d.toISOString().slice(0, 10)}${days >= 0 ? ` (in ${days}d)` : ' (recent)'}`);
    }
    if (fund.length) lines.push('FUNDAMENTALS: ' + fund.join(' | '));
  }

  if (!lines.length) return '';
  return `=== COMPUTED QUANT DATA for ${symbol} (precise values from real OHLCV + fundamentals — TRUST THESE over reading numbers off the screenshot) ===\n${lines.join('\n')}`;
}
