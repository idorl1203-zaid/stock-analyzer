export type Language = 'en' | 'he';
export type Recommendation = 'BUY' | 'SELL' | 'HOLD' | 'AVOID';
export type Trend = 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type RiskProfile = 'conservative' | 'balanced' | 'aggressive';
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1mo';
export type Theme = 'dark-purple' | 'dark-blue' | 'dark-green' | 'midnight';

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

export interface AnalysisResult {
  chartAnalysis: string;
  trend: Trend;
  momentum: string;
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
