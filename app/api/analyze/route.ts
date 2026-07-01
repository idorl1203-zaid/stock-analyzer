import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { AnalysisResult, RiskProfile } from '@/lib/types';
import { getMarketContext } from '@/lib/marketContext';
import { canAnalyze, recordAnalysis, rateLimit, dbConfigured } from '@/lib/usageDb';

// Anthropic rejects images whose base64 string exceeds 10MB. Guard a bit below that
// (the client also downscales to ~1568px, so this is just a backstop).
const MAX_IMAGE_B64_BYTES = 9 * 1024 * 1024;

// Anthropic Claude: strong vision + adaptive thinking for institutional-grade reads.
// Sonnet 4.6 is the cost/quality default; Haiku 4.5 is the cheaper/faster fallback.
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL_PRIMARY = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const MODEL_FALLBACK = process.env.ANTHROPIC_MODEL_FALLBACK || 'claude-haiku-4-5-20251001';
// Extended-thinking token budget. Quality-first: a deep, institutional-grade read
// needs real reasoning room (multi-timeframe confluence, R:R, chart calibration).
// Anthropic MINIMUM is 1024 (lower → 400). Set 0 to disable thinking entirely.
const RAW_BUDGET = Number(process.env.ANTHROPIC_THINKING_BUDGET ?? 1024);
const THINKING_BUDGET = RAW_BUDGET <= 0 ? 0 : Math.max(1024, RAW_BUDGET);
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// Sonnet 4.6 + adaptive thinking on a real chart takes ~60-90s, which tripped the
// old 60s cap → 504. Vercel Pro allows up to 300s; give generous headroom.
export const maxDuration = 300;

// Strict output contract — mirrors AnalysisResult so the UI stays unchanged.
// Anthropic Structured Outputs (output_config.format): every object needs
// additionalProperties:false and a `required` array listing all its keys.
const responseSchema = {
  type: 'object',
  properties: {
    chartAnalysis: { type: 'string' },
    trend: { type: 'string', enum: ['BULLISH', 'BEARISH', 'SIDEWAYS'] },
    momentum: { type: 'string', enum: ['STRONG', 'MODERATE', 'WEAK'] },
    setupGrade: { type: 'string', enum: ['A+', 'A', 'B', 'C', 'D'] },
    keyLevels: {
      type: 'object',
      properties: {
        support: { type: 'array', items: { type: 'string' } },
        resistance: { type: 'array', items: { type: 'string' } },
      },
      required: ['support', 'resistance'],
      additionalProperties: false,
    },
    patterns: { type: 'array', items: { type: 'string' } },
    indicators: { type: 'string' },
    recommendation: { type: 'string', enum: ['BUY', 'SELL', 'HOLD', 'AVOID'] },
    confidenceScore: { type: 'integer' },
    stopLoss: {
      type: 'object',
      properties: { level: { type: 'string' }, reasoning: { type: 'string' } },
      required: ['level', 'reasoning'],
      additionalProperties: false,
    },
    takeProfit: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          target: { type: 'string' },
          percentage: { type: 'string' },
          reasoning: { type: 'string' },
        },
        required: ['target', 'percentage', 'reasoning'],
        additionalProperties: false,
      },
    },
    newsImpact: { type: 'string' },
    riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
    timeHorizon: { type: 'string' },
    reasoning: { type: 'string' },
    summary: { type: 'string' },
    warnings: { type: 'array', items: { type: 'string' } },
    calibration: {
      type: 'object',
      properties: {
        points: {
          type: 'array',
          items: {
            type: 'object',
            properties: { price: { type: 'number' }, yPct: { type: 'number' } },
            required: ['price', 'yPct'],
            additionalProperties: false,
          },
        },
      },
      required: ['points'],
      additionalProperties: false,
    },
  },
  required: [
    'chartAnalysis', 'trend', 'momentum', 'setupGrade', 'keyLevels', 'patterns', 'indicators',
    'recommendation', 'confidenceScore', 'stopLoss', 'takeProfit', 'newsImpact',
    'riskLevel', 'timeHorizon', 'reasoning', 'summary', 'warnings', 'calibration',
  ],
  additionalProperties: false,
};

function buildPrompt(stockName: string, timeframe: string, riskProfile: RiskProfile, newsContext: string, marketData: string, quantData: string, language: string): string {
  const isHebrew = language === 'he';

  const timeframeLabel = {
    '1m': '1-minute', '5m': '5-minute', '15m': '15-minute', '1h': '1-hour',
    '4h': '4-hour', '1d': 'daily', '1w': 'weekly', '1mo': 'monthly',
  }[timeframe] || timeframe;

  const riskInstructions: Record<string, string> = {
    conservative: 'CONSERVATIVE trader — prioritise capital preservation. Tighter stop placement, only high-probability setups, realistic targets, demand strong confluence before a BUY/SELL.',
    balanced: 'BALANCED trader — standard risk management, aim for a clean risk/reward of roughly 1:2 or better.',
    aggressive: 'AGGRESSIVE trader — higher risk tolerance, wider stops and more ambitious targets are acceptable, but the thesis must still be sound.',
  };

  const langInstruction = isHebrew
    ? `LANGUAGE: Write EVERY descriptive string value (chartAnalysis, momentum is an enum so keep English, indicators, reasoning, summary, newsImpact, timeHorizon, every reasoning field, support/resistance descriptions, warnings) in fluent, professional HEBREW — the way a senior Israeli market analyst writes. Keep all JSON keys and ENUM values (BULLISH/BEARISH/SIDEWAYS, STRONG/MODERATE/WEAK, BUY/SELL/HOLD/AVOID, LOW/MEDIUM/HIGH) in English. Prices stay numeric.`
    : `LANGUAGE: Write all descriptive text in clear, professional English.`;

  return `You are "StockAI", a Chartered Market Technician (CMT) with 20+ years analysing global equities on an institutional trading desk. You are precise, disciplined, risk-first and intellectually honest. You never hype, never fabricate data, and you openly flag uncertainty.

ASSIGNMENT: Deliver an institutional-grade technical read of the attached **${timeframeLabel} chart of ${stockName}** for a ${riskProfile} trader.
TRADER PROFILE: ${riskInstructions[riskProfile] || riskInstructions.balanced}

${marketData ? `LIVE MARKET DATA (treat the price here as the GROUND-TRUTH anchor for "current price" — the screenshot may be slightly stale):\n${marketData}\n` : 'No live market data was supplied — infer the current price from the chart axis and say so.\n'}
${quantData ? `${quantData}\n(Use these COMPUTED indicator values as the source of truth for indicator readings — RSI, MACD, moving averages, ATR, ADX, Bollinger, relative volume — rather than estimating them visually. Cross-check the chart against them, weigh the multi-timeframe alignment (daily vs weekly), respect the fundamentals, and NEVER plan a short-term swing straight into an earnings date.)\n` : ''}
${newsContext ? `RECENT NEWS / CATALYSTS:\n${newsContext}\n` : ''}

WORK THROUGH THIS METHOD BEFORE ANSWERING:
1. CHART READING — Read the Y-axis scale precisely. Anchor the current price to the live data above. Note the visible range, candle structure and volume.
2. MARKET STRUCTURE & TREND — Read the trend on THIS timeframe from swing highs/lows (HH/HL = up, LH/LL = down, else sideways). Grade momentum STRONG / MODERATE / WEAK from candle bodies, slope and volume.
3. KEY LEVELS — Derive support & resistance from REAL price action: prior swing points, consolidation zones, breakout/breakdown levels, gaps, round numbers. Give EXACT prices, each followed by a short reason. They must sit logically around the live price.
4. PATTERNS & CANDLES — Name only patterns genuinely present and state their confirmation status. Never force a pattern that isn't there.
5. INDICATORS — Comment only on indicators actually visible (moving averages, RSI, MACD, volume…). If none are visible, say so explicitly — do NOT invent readings.
6. CATALYSTS — Weigh the supplied news: real catalyst, earnings or headline risk?
7. TRADE PLAN — Decide BUY / SELL / HOLD / AVOID, then define a precise entry (or zone), a stop-loss placed just beyond a true invalidation level (buffer scaled to volatility and the trader profile), and 2–3 take-profit targets at genuine opposing levels. For EACH target give the price, the exact % move from the live price, and the rationale. ALWAYS compute and state the exact risk/reward ratio (e.g. "R:R ≈ 1:2.6") inside each target's reasoning, measured from entry to that target vs entry to stop.
8. RISK & INVALIDATION — Set riskLevel honestly and list concrete warnings: what invalidates the thesis, any conflicting signals, gap/liquidity/earnings risk.
9. CONFIDENCE — This is a precise, evidence-weighted number, NOT a habit. Internally count the independent factors that ALIGN (trend, market structure, volume confirmation, indicators, level confluence, candlestick signal, news catalyst) versus those that CONFLICT, and let the net drive the score. Calibration: 30–45 = thin/conflicting edge; 46–62 = a real but ordinary setup; 63–77 = solid multi-factor alignment; 78–90 = exceptional confluence; 90+ = textbook, reserved for rare cases. Avoid lazy round defaults (70, 75, 80) — if the evidence says 64 or 83, output exactly that. Two analyses should rarely share the same score.
10. CHART CALIBRATION (so the app can draw your levels at the EXACT right height on the user's image) — provide calibration.points: a list of (price, yPct) anchor pairs, where yPct is the vertical position as a percentage of the FULL image height (0 = very top edge, 100 = very bottom edge). Give AS MANY reliable anchors as you can (aim for 4-6, evenly spread top-to-bottom) — more anchors make the overlay far more accurate:
   • MANDATORY first anchor — the CURRENT-PRICE MARKER: the horizontal dashed line / the price tag carrying the ticker label. Its price is EXACTLY the live current price given above; read its yPct as precisely as you can.
   • Each clearly-labeled price GRIDLINE on the Y-axis: its printed number = price, its vertical position = yPct.
   • If the Y-axis numbers are cropped/not visible, instead anchor on identifiable CANDLES: the highest visible candle's high and the lowest visible candle's low, estimating each price from the current-price anchor and the candle spacing.
   Read every vertical position carefully and consistently (same 0-100 top-to-bottom scale). The points must be monotonic: higher price → smaller yPct. These anchors are what make the drawn lines line up — precision here matters more than anything.
11. SETUP GRADE — Assign an institutional conviction grade for THIS specific trade in setupGrade: A+ = textbook, deep multi-factor confluence with clean risk/reward ≥ 1:3; A = strong, high-conviction; B = decent but with notable caveats; C = marginal/speculative, thin edge; D = no edge, AVOID. Grade STRICTLY and honestly — most real setups are B or C, A is uncommon, A+ is rare. Justify the grade in one sentence within reasoning.

HARD RULES:
- RECOMMENDATION MUST MATCH THE PLAN. If a clean directional setup exists with acceptable risk/reward, give the directional call — SELL when the bias is bearish (a short), BUY when bullish (a long). Do NOT bury a real short/long behind "AVOID". Use AVOID only when there is genuinely no edge or the risk is unacceptable in both directions; use HOLD only for staying in an existing position. When the recommendation IS AVOID or HOLD, the stop-loss and take-profit you provide are CONDITIONAL reference levels for a user who chooses to act anyway — make this explicit in the reasoning (e.g. "I would not enter here, but if you do take the short, the relevant levels are…"). Always orient the levels to the directional bias (short → stop ABOVE, targets BELOW; long → stop BELOW, targets ABOVE), even for AVOID/HOLD.
- Anchor EVERY price to the live current price. For a BUY: stopLoss < entry < take-profits (ascending). For a SELL/short: take-profits < entry < stopLoss. Order take-profits correctly.
- RISK/REWARD DISCIPLINE (verify the arithmetic, do not eyeball): R:R = |target − entry| ÷ |entry − stopLoss|, expressed reward:risk (e.g. target 15 away with stop 10 away = 1.5:1). The FIRST/primary target MUST give R:R ≥ 1.5:1 for a BUY or SELL call; if the nearest logical target yields less, tighten the stop to a still-valid invalidation level, choose a further primary target, or grade the setup DOWN / use AVOID. NEVER present as a clean BUY/SELL a trade whose stop-loss distance is larger than its first target's distance. Recompute and sanity-check every R:R number before returning it.
- VOLUME: the QUANT DATA volume is from the last CLOSED candle vs its 20-period average — treat it as the real relative-volume read; do NOT claim "volume collapsed" from a partial/intraday bar.
- Compute every percentage correctly from the live price. Never output a price off the chart's scale.
- If the image is unreadable or is not a price chart, say so plainly in chartAnalysis, set recommendation = AVOID and a low confidenceScore.
- Be specific and quantitative — every claim must be defensible to a desk head. No vague filler.
- BE CONCISE — top desk analysts are punchy, not wordy. Insight comes from PRECISION and CONFLUENCE, never word count. HARD length limits: chartAnalysis ≤3 sentences; reasoning ≤3 sentences; summary ≤2 sentences; indicators ≤3 sentences; newsImpact ≤2 sentences; each stopLoss/takeProfit reasoning ≤1 tight sentence; each support/resistance item a short phrase (≤12 words); ≤4 warnings, each ≤1 short line. Never repeat a point across chartAnalysis/reasoning/summary — each has a distinct job. Cover the essentials (trend, key levels, R:R, catalyst risk) and stop.
- This is educational analysis, not financial advice.

${langInstruction}

Return ONLY the JSON object conforming to the schema. Make support/resistance items strings like "192.40 — prior swing high reclaimed".`;
}

interface AnthropicResp {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
  usage?: Record<string, number>;
}

// Pull the JSON payload from the text block (thinking blocks are skipped).
function extractText(data: AnthropicResp): string {
  const block = (data?.content || []).find((b) => b.type === 'text');
  return (block?.text || '').trim();
}

// Anthropic only accepts a fixed set of image media types.
function normalizeMediaType(mime: string): string {
  const m = (mime || '').toLowerCase();
  return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(m) ? m : 'image/jpeg';
}

async function callAnthropic(model: string, imageBase64: string, mimeType: string, prompt: string) {
  return fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 12000, // thinking budget + the JSON output
      // Capped thinking (≥1024): 'adaptive' is unbounded → a detailed chart can
      // reason for minutes. A fixed budget keeps latency predictable while keeping
      // real reasoning depth. Omitted entirely when budget is 0.
      ...(THINKING_BUDGET > 0 ? { thinking: { type: 'enabled', budget_tokens: THINKING_BUDGET } } : {}),
      // Structured Outputs — guarantees valid JSON matching the schema.
      output_config: { format: { type: 'json_schema', schema: responseSchema } },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: normalizeMediaType(mimeType), data: imageBase64 } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType, stockName, symbol, timeframe, riskProfile, newsContext, marketData, language } = body;

    if (!imageBase64 || !stockName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate payload shape/size before doing any expensive work.
    if (typeof imageBase64 !== 'string' || typeof stockName !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    if (imageBase64.length > MAX_IMAGE_B64_BYTES) {
      return NextResponse.json({ error: 'Image too large — please use a smaller screenshot', code: 'IMAGE_TOO_LARGE' }, { status: 413 });
    }

    // Server-side quota + burst enforcement (source of truth when the DB is configured).
    const { userId } = await auth();
    if (dbConfigured()) {
      if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      if (!(await rateLimit(userId, 'analyze', 8, 60))) {
        return NextResponse.json({ error: 'Too many requests, slow down', code: 'RATE_LIMITED' }, { status: 429 });
      }
      if (!(await canAnalyze(userId))) {
        return NextResponse.json({ error: 'Monthly analysis limit reached', code: 'QUOTA_EXCEEDED' }, { status: 429 });
      }
    }

    // Derive a ticker and pull precise quant context (computed indicators + fundamentals).
    const ticker = (symbol || stockName.match(/\(([^)]+)\)/)?.[1] || stockName.split(' ').pop() || stockName).toString();
    const quantData = await getMarketContext(ticker).catch((e) => { console.error('marketContext error:', e); return ''; });

    const prompt = buildPrompt(stockName, timeframe || '1d', riskProfile || 'balanced', newsContext || '', marketData || '', quantData, language || 'en');

    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set');
      return NextResponse.json({ error: 'AI engine not configured' }, { status: 500 });
    }

    // Try the primary model first; fall back to the cheaper model if it errors.
    let response = await callAnthropic(MODEL_PRIMARY, imageBase64, mimeType, prompt);
    if (!response.ok) {
      console.error(`Anthropic ${MODEL_PRIMARY} error:`, await response.text().catch(() => ''));
      response = await callAnthropic(MODEL_FALLBACK, imageBase64, mimeType, prompt);
    }

    if (!response.ok) {
      console.error('Anthropic API error:', await response.text().catch(() => ''));
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 502 });
    }

    const data: AnthropicResp = await response.json();
    // Token usage — log to refine the per-analysis cost model (see COST_ANALYSIS.md).
    if (data.usage) console.log('[analyze] token usage:', JSON.stringify(data.usage));
    let cleanText = extractText(data);
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    if (!cleanText) {
      console.error('Empty Anthropic response. stop_reason:', data?.stop_reason);
      return NextResponse.json({ error: 'Empty analysis returned' }, { status: 502 });
    }

    let analysisResult: AnalysisResult;
    try {
      analysisResult = JSON.parse(cleanText);
    } catch {
      console.error('Failed to parse Anthropic response:', cleanText.slice(0, 500));
      return NextResponse.json({ error: 'Failed to parse analysis' }, { status: 502 });
    }

    if (dbConfigured() && userId) await recordAnalysis(userId);
    return NextResponse.json({ result: analysisResult });
  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
