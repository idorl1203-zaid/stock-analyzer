export type Language = 'en' | 'he';
export type Recommendation = 'BUY' | 'SELL' | 'HOLD' | 'AVOID';
export type Trend = 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type RiskProfile = 'conservative' | 'balanced' | 'aggressive';
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1mo';
export type Theme = 'dark' | 'light';

export interface StockData {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  marketCap: number | null;
  high52w: number | null;
  low52w: number | null;
  name: string | null;
  currency: string | null;
}

export interface NewsItem {
  title: string;
  url: string;
  description: string;
  age: string;
}

export interface TakeProfitTarget {
  target: string;
  percentage: string;
  reasoning: string;
}

export interface StopLossInfo {
  level: string;
  reasoning: string;
}

export type SetupGrade = 'A+' | 'A' | 'B' | 'C' | 'D';

export interface AnalysisResult {
  chartAnalysis: string;
  trend: Trend;
  momentum: string;
  setupGrade?: SetupGrade;
  keyLevels: {
    support: string[];
    resistance: string[];
  };
  patterns: string[];
  indicators: string;
  recommendation: Recommendation;
  confidenceScore: number;
  stopLoss: StopLossInfo;
  takeProfit: TakeProfitTarget[];
  newsImpact: string;
  riskLevel: RiskLevel;
  timeHorizon: string;
  reasoning: string;
  summary: string;
  warnings: string[];
  // Calibration for overlaying levels back onto the uploaded chart image.
  priceAxis?: { top: number; bottom: number };       // price at top / bottom of the candle pane
  chartArea?: { topPct: number; bottomPct: number };  // candle pane bounds as % of image height
}

export interface AnalysisRecord {
  id: string;
  timestamp: number;
  stockName: string;
  stockSymbol: string;
  timeframe: Timeframe;
  riskProfile: RiskProfile;
  imageBase64: string;
  result: AnalysisResult;
  stockData: StockData | null;
  news: NewsItem[];
  language: Language;
}

export interface JournalEntry {
  id: string;
  timestamp: number;
  stockName: string;
  stockSymbol: string;
  analysisId?: string;
  status: 'watching' | 'active' | 'closed';
  entryPrice?: number;
  exitPrice?: number;
  notes: string;
  recommendation: Recommendation;
  stopLoss?: string;
  takeProfit?: string;
  pnl?: number;
  pnlPercent?: number;
}

export interface AppSettings {
  language: Language;
  riskProfile: RiskProfile;
  theme: Theme;
}

// ─── Paper trading (demo portfolio) ───────────────────────────────────────────
export interface PaperPosition {
  id: string;
  symbol: string;
  name: string;
  side: 'long' | 'short';
  qty: number;
  entryPrice: number;
  openedAt: number;
  analysisId?: string;
  recommendation?: Recommendation;
  stopLoss?: number;
  takeProfit?: number;
}

export type CloseReason = 'sl' | 'tp' | 'manual';

export interface PaperTrade extends PaperPosition {
  exitPrice: number;
  closedAt: number;
  pnl: number;
  pnlPercent: number;
  closeReason?: CloseReason;
}

export interface Portfolio {
  cash: number;
  startingCash: number;
  positions: PaperPosition[];
  trades: PaperTrade[];
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  addedAt: number;
  lastPrice?: number;
  lastChange?: number;
  lastChangePercent?: number;
  lastUpdated?: number;
}
