import { NextRequest, NextResponse } from 'next/server';
import { AnalysisResult, RiskProfile, Timeframe } from '@/lib/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

function buildPrompt(stockName: string, timeframe: string, riskProfile: RiskProfile, newsContext: string, marketData: string, language: string): string {
  const isHebrew = language === 'he';

  const hebrewSystemInstruction = isHebrew ? `
CRITICAL LANGUAGE REQUIREMENT: You MUST write ALL descriptive text values in the JSON response in fluent, natural HEBREW (עברית).
This applies to ALL string fields: chartAnalysis, momentum, indicators, reasoning, summary, newsImpact, timeHorizon, stopLoss.reasoning, every takeProfit.reasoning, and every item in the warnings array.
The JSON keys must remain in English. Enum values (BULLISH/BEARISH/SIDEWAYS, BUY/SELL/HOLD/AVOID, LOW/MEDIUM/HIGH, STRONG/MODERATE/WEAK) must remain in English.
Write the Hebrew text as a professional Israeli financial analyst would write — use proper financial Hebrew terminology.
` : '';

  const riskInstructions = {
    conservative: isHebrew
      ? 'המשתמש הוא סוחר שמרני. תן עדיפות לשמירה על הון. סטופ לוס הדוק יחסית, ויעדי רווח מציאותיים.'
      : 'User is conservative. Prioritize capital preservation. Tighter stop losses, realistic profit targets.',
    balanced: isHebrew
      ? 'המשתמש הוא סוחר מאוזן. איזון בין סיכון לתשואה. ניהול סיכונים סטנדרטי.'
      : 'User is balanced. Balance risk/reward. Standard risk management.',
    aggressive: isHebrew
      ? 'המשתמש הוא סוחר אגרסיבי. מוכן לסיכון גדול יותר. יעדי רווח גבוהים יותר עם סטופ לוס רחב יחסית.'
      : 'User is aggressive. Higher risk tolerance. Higher profit targets with wider stop loss.',
  };

  const timeframeLabel = {
    '1m': isHebrew ? 'גרף דקה' : '1-minute chart',
    '5m': isHebrew ? 'גרף 5 דקות' : '5-minute chart',
    '15m': isHebrew ? 'גרף 15 דקות' : '15-minute chart',
    '1h': isHebrew ? 'גרף שעתי' : '1-hour chart',
    '4h': isHebrew ? 'גרף 4 שעות' : '4-hour chart',
    '1d': isHebrew ? 'גרף יומי' : 'daily chart',
    '1w': isHebrew ? 'גרף שבועי' : 'weekly chart',
    '1mo': isHebrew ? 'גרף חודשי' : 'monthly chart',
  }[timeframe] || timeframe;

  return `You are StockAI — an elite professional stock market analyst with 20+ years of experience in technical analysis, fundamental analysis, and risk management.
${hebrewSystemInstruction}
Analyze this stock chart image for: **${stockName}**
Timeframe: **${timeframeLabel}**
Risk profile: **${riskProfile}** — ${riskInstructions[riskProfile as keyof typeof riskInstructions]}

${marketData ? `Current Market Data:\n${marketData}\n` : ''}
${newsContext ? `Latest News Context:\n${newsContext}\n` : ''}

Provide a comprehensive, professional analysis. 
CRITICAL TECHNICAL ACCURACY RULES:
1. Accurately read the Y-axis (price scale) on the chart.
2. CRITICAL: Use the "Current Market Data" provided as your EXACT anchor for the current price. 
3. ALL price levels you provide (support, resistance, stop loss, take profit) MUST be mathematically realistic and calculated relative to the "Current Market Data" price. DO NOT hallucinate prices that are completely out of scale.
4. Stop Loss and Take Profit levels must make logical sense relative to the current price and Trend (e.g., Stop Loss for a BUY must be BELOW current price, Take Profit must be ABOVE).

Respond ONLY with a valid JSON object (no markdown, no code blocks, just pure JSON):
{
  "chartAnalysis": "${isHebrew ? 'ניתוח טכני מפורט של הגרף - מגמות, פעולת מחיר, נפח, תבניות נרות יפניים וכו\'' : 'Detailed technical analysis of the chart'}",
  "trend": "BULLISH or BEARISH or SIDEWAYS",
  "momentum": "STRONG or MODERATE or WEAK",
  "keyLevels": {
    "support": ["${isHebrew ? 'רמת תמיכה 1' : 'specific level 1'}", "${isHebrew ? 'רמת תמיכה 2' : 'specific level 2'}"],
    "resistance": ["${isHebrew ? 'רמת התנגדות 1' : 'specific level 1'}", "${isHebrew ? 'רמת התנגדות 2' : 'specific level 2'}"]
  },
  "patterns": ["${isHebrew ? 'תבניות גרפיות שזוהו' : 'Chart patterns identified'}"],
  "indicators": "${isHebrew ? 'ניתוח אינדיקטורים' : 'Analysis of visible indicators'}",
  "recommendation": "BUY or SELL or HOLD or AVOID",
  "confidenceScore": 75,
  "stopLoss": {
    "level": "${isHebrew ? 'רמת מחיר ספציפית לסטופ לוס' : 'specific price level'}",
    "reasoning": "${isHebrew ? 'הסבר לבחירת רמת הסטופ לוס' : 'why this stop loss level'}"
  },
  "takeProfit": [
    {"target": "${isHebrew ? 'יעד TP1' : 'TP1 price'}", "percentage": "+X%", "reasoning": "${isHebrew ? 'הסבר ליעד הראשון' : 'first target reasoning'}"},
    {"target": "${isHebrew ? 'יעד TP2' : 'TP2 price'}", "percentage": "+X%", "reasoning": "${isHebrew ? 'הסבר ליעד השני' : 'second target reasoning'}"}
  ],
  "newsImpact": "${isHebrew ? 'השפעת החדשות האחרונות על המניה' : 'How recent news may affect the stock'}",
  "riskLevel": "LOW or MEDIUM or HIGH",
  "timeHorizon": "${isHebrew ? 'טווח זמן מומלץ' : 'SHORT-TERM (days) or MEDIUM-TERM (weeks) or LONG-TERM (months)'}",
  "reasoning": "${isHebrew ? 'ניתוח מקיף ומפורט של כל הגורמים' : 'Comprehensive analysis and reasoning'}",
  "summary": "${isHebrew ? 'סיכום קצר של 2-3 משפטים' : '2-3 sentence executive summary'}",
  "warnings": ["${isHebrew ? 'גורם סיכון 1' : 'Risk factor 1'}", "${isHebrew ? 'גורם סיכון 2' : 'Risk factor 2'}"]
}

Guidelines:
- Be specific with price levels when visible in the chart
- Adjust stop loss aggressiveness based on risk profile
- Consider both technical and news factors
- Confidence score: 0-100 based on signal clarity
- Educational purposes only`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType, stockName, timeframe, riskProfile, newsContext, marketData, language } = body;

    if (!imageBase64 || !stockName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const prompt = buildPrompt(stockName, timeframe || '1d', riskProfile || 'balanced', newsContext || '', marketData || '', language || 'en');

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: imageBase64,
              }
            },
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini API error:', err);
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean the response - remove any markdown code blocks if present
    let cleanText = rawText.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let analysisResult: AnalysisResult;
    try {
      analysisResult = JSON.parse(cleanText);
    } catch {
      console.error('Failed to parse Gemini response:', cleanText);
      return NextResponse.json({ error: 'Failed to parse analysis' }, { status: 500 });
    }

    return NextResponse.json({ result: analysisResult });
  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
