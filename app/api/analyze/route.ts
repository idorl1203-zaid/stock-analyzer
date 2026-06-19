import { NextRequest, NextResponse } from 'next/server';
import { AnalysisResult, RiskProfile } from '@/lib/types';

// Pro-tier reasoning + vision for institutional-grade reads; flash as a fast fallback.
const MODEL_PRIMARY = 'gemini-2.5-pro';
const MODEL_FALLBACK = 'gemini-2.5-flash';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const geminiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

// Pro + thinking on a chart can take a while — give the function room (Vercel).
export const maxDuration = 60;

// Strict output contract — mirrors AnalysisResult so the UI stays unchanged.
const responseSchema = {
  type: 'OBJECT',
  properties: {
    chartAnalysis: { type: 'STRING' },
    trend: { type: 'STRING', enum: ['BULLISH', 'BEARISH', 'SIDEWAYS'] },
    momentum: { type: 'STRING', enum: ['STRONG', 'MODERATE', 'WEAK'] },
    setupGrade: { type: 'STRING', enum: ['A+', 'A', 'B', 'C', 'D'] },
    keyLevels: {
      type: 'OBJECT',
      properties: {
        support: { type: 'ARRAY', items: { type: 'STRING' } },
        resistance: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['support', 'resistance'],
    },
    patterns: { type: 'ARRAY', items: { type: 'STRING' } },
    indicators: { type: 'STRING' },
    recommendation: { type: 'STRING', enum: ['BUY', 'SELL', 'HOLD', 'AVOID'] },
    confidenceScore: { type: 'INTEGER' },
    stopLoss: {
      type: 'OBJECT',
      properties: { level: { type: 'STRING' }, reasoning: { type: 'STRING' } },
      required: ['level', 'reasoning'],
    },
    takeProfit: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          target: { type: 'STRING' },
          percentage: { type: 'STRING' },
          reasoning: { type: 'STRING' },
        },
        required: ['target', 'percentage', 'reasoning'],
      },
    },
    newsImpact: { type: 'STRING' },
    riskLevel: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH'] },
    timeHorizon: { type: 'STRING' },
    reasoning: { type: 'STRING' },
    summary: { type: 'STRING' },
    warnings: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: [
    'chartAnalysis', 'trend', 'momentum', 'setupGrade', 'keyLevels', 'patterns', 'indicators',
    'recommendation', 'confidenceScore', 'stopLoss', 'takeProfit', 'newsImpact',
    'riskLevel', 'timeHorizon', 'reasoning', 'summary', 'warnings',
  ],
};

function buildPrompt(stockName: string, timeframe: string, riskProfile: RiskProfile, newsContext: string, marketData: string, language: string): string {
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
10. SETUP GRADE — Assign an institutional conviction grade for THIS specific trade in setupGrade: A+ = textbook, deep multi-factor confluence with clean risk/reward ≥ 1:3; A = strong, high-conviction; B = decent but with notable caveats; C = marginal/speculative, thin edge; D = no edge, AVOID. Grade STRICTLY and honestly — most real setups are B or C, A is uncommon, A+ is rare. Justify the grade in one sentence within reasoning.

HARD RULES:
- Anchor EVERY price to the live current price. For a BUY: stopLoss < entry < take-profits (ascending). For a SELL/short: take-profits < entry < stopLoss. Order take-profits correctly.
- Compute every percentage correctly from the live price. Never output a price off the chart's scale.
- If the image is unreadable or is not a price chart, say so plainly in chartAnalysis, set recommendation = AVOID and a low confidenceScore.
- Be specific and quantitative — every claim must be defensible to a desk head. No vague filler.
- This is educational analysis, not financial advice.

${langInstruction}

Return ONLY the JSON object conforming to the schema. Make support/resistance items strings like "192.40 — prior swing high reclaimed".`;
}

interface GeminiResp {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
}

function extractText(data: GeminiResp): string {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p?.text || '').join('').trim();
}

async function callGemini(model: string, imageBase64: string, mimeType: string, prompt: string) {
  return fetch(geminiUrl(model), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } },
          { text: prompt },
        ],
      }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema,
        thinkingConfig: { thinkingBudget: -1 }, // dynamic deep reasoning
      },
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType, stockName, timeframe, riskProfile, newsContext, marketData, language } = body;

    if (!imageBase64 || !stockName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const prompt = buildPrompt(stockName, timeframe || '1d', riskProfile || 'balanced', newsContext || '', marketData || '', language || 'en');

    // Try the Pro model first; fall back to Flash if it errors or returns nothing usable.
    let response = await callGemini(MODEL_PRIMARY, imageBase64, mimeType, prompt);
    if (!response.ok) {
      console.error(`Gemini ${MODEL_PRIMARY} error:`, await response.text().catch(() => ''));
      response = await callGemini(MODEL_FALLBACK, imageBase64, mimeType, prompt);
    }

    if (!response.ok) {
      console.error('Gemini API error:', await response.text().catch(() => ''));
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 502 });
    }

    const data: GeminiResp = await response.json();
    let cleanText = extractText(data);
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    if (!cleanText) {
      console.error('Empty Gemini response. finishReason:', data?.candidates?.[0]?.finishReason);
      return NextResponse.json({ error: 'Empty analysis returned' }, { status: 502 });
    }

    let analysisResult: AnalysisResult;
    try {
      analysisResult = JSON.parse(cleanText);
    } catch {
      console.error('Failed to parse Gemini response:', cleanText.slice(0, 500));
      return NextResponse.json({ error: 'Failed to parse analysis' }, { status: 502 });
    }

    return NextResponse.json({ result: analysisResult });
  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
