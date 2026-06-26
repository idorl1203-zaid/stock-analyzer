'use client';
import { useState, useEffect } from 'react';
import { Language, AnalysisResult, StockData, NewsItem, AnalysisRecord, Timeframe, RiskProfile, Theme } from '@/lib/types';
import { getSettings, saveSettings, saveAnalysis, generateId, saveTheme, migrateStorageIfNeeded } from '@/lib/storage';
import { createThumbnail, base64ToDataUrl } from '@/lib/imageUtils';
import { putChartImage, getChartImage } from '@/lib/imageStore';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import StatusBar from '@/components/StatusBar';
import BootSequence from '@/components/BootSequence';
import CommandPalette from '@/components/CommandPalette';
import AnalyzeForm from '@/components/AnalyzeForm';
import AnalysisResultView from '@/components/AnalysisResult';
import History from '@/components/History';
import Journal from '@/components/Journal';
import Dashboard from '@/components/Dashboard';
import Watchlist from '@/components/Watchlist';
import Portfolio from '@/components/Portfolio';
import Plans from '@/components/Plans';
import ThemeBackground from '@/components/ThemeBackground';
import SyncManager from '@/components/SyncManager';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('dark');
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingAnalyzeSymbol, setPendingAnalyzeSymbol] = useState('');

  // Analysis state - full-res image stays only in memory, thumbnail goes to storage
  const [showResult, setShowResult] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [currentStockData, setCurrentStockData] = useState<StockData | null>(null);
  const [currentNews, setCurrentNews] = useState<NewsItem[]>([]);
  const [currentStockName, setCurrentStockName] = useState('');
  const [currentImageBase64, setCurrentImageBase64] = useState(''); // full-res for display

  // Boot sequence (once per session)
  const [booting, setBooting] = useState(false);

  // Toast UX
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const settings = getSettings();
    setLanguage(settings.language);
    setTheme(settings.theme || 'dark');
    // Migrate any oversized images from before the compression fix
    migrateStorageIfNeeded();
    // Show boot sequence once per browser session
    try {
      if (!sessionStorage.getItem('stockai_booted')) setBooting(true);
    } catch { /* ignore */ }
  }, []);

  const finishBoot = () => {
    try { sessionStorage.setItem('stockai_booted', '1'); } catch { /* ignore */ }
    setBooting(false);
  };

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Keep <html> lang/dir in sync with the selected language (a11y + correct RTL)
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  }, [language]);

  // Listen for storage errors (QuotaExceededError)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const msg = language === 'he'
        ? '⚠️ האחסון המקומי מלא. מחק ניתוחים ישנים כדי לפנות מקום.'
        : '⚠️ Local storage is full. Delete old analyses to free up space.';
      showToast(msg, 'error');
      console.error('[StorageError]', detail);
    };
    window.addEventListener('storage-error', handler);
    return () => window.removeEventListener('storage-error', handler);
  }, [language]);

  const toggleLanguage = () => {
    const newLang: Language = language === 'en' ? 'he' : 'en';
    setLanguage(newLang);
    const settings = getSettings();
    saveSettings({ ...settings, language: newLang });
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    saveTheme(newTheme);
  };

  const handleResult = async (
    result: AnalysisResult, stockData: StockData | null, news: NewsItem[],
    imageBase64: string, imageMime: string, stockName: string, timeframe: Timeframe, riskProfile: RiskProfile
  ) => {
    // Keep full-res image in memory for the sharp immediate view
    setCurrentResult(result);
    setCurrentStockData(stockData);
    setCurrentNews(news);
    setCurrentStockName(stockName);
    setCurrentImageBase64(imageBase64);
    setShowResult(true);

    const recordId = generateId();

    // Tiny thumbnail (160x120) -> localStorage list; high-res (≤1600px) -> IndexedDB.
    let listThumb = imageBase64;
    let highRes = imageBase64;
    try { listThumb = await createThumbnail(imageBase64, imageMime || 'image/jpeg', 160, 120, 0.6); } catch { /* keep original */ }
    try { highRes = await createThumbnail(imageBase64, imageMime || 'image/jpeg', 1600, 1200, 0.85); } catch { /* keep original */ }
    putChartImage(recordId, base64ToDataUrl(highRes)); // fire-and-forget, large quota

    const record: AnalysisRecord = {
      id: recordId,
      timestamp: Date.now(),
      stockName,
      stockSymbol: stockData?.symbol || stockName,
      timeframe,
      riskProfile,
      imageBase64: listThumb,  // small list thumbnail only
      result,
      stockData,
      news: news.slice(0, 5), // limit to 5 news items
      language,
    };

    const saved = saveAnalysis(record);
    setRefreshKey(k => k + 1);

    if (saved) {
      showToast(language === 'he' ? '✅ הניתוח הושלם ונשמר!' : '✅ Analysis completed and saved!', 'success');
    } else {
      showToast(
        language === 'he'
          ? '✅ הניתוח הושלם אבל לא נשמר — האחסון מלא. מחק ניתוחים ישנים.'
          : '✅ Analysis done but could not save — storage full. Delete old analyses.',
        'error'
      );
    }
  };

  const handleViewAnalysis = async (record: AnalysisRecord) => {
    setCurrentResult(record.result);
    setCurrentStockData(record.stockData);
    setCurrentNews(record.news);
    setCurrentStockName(record.stockName);
    setCurrentImageBase64(record.imageBase64); // show thumb instantly…
    setShowResult(true);
    setActiveTab('analyze');
    // …then swap in the sharp high-res from IndexedDB if available
    const full = await getChartImage(record.id);
    if (full) setCurrentImageBase64(full);
  };

  // Watchlist → Analyze: prefill symbol
  const handleWatchlistAnalyze = (symbol: string) => {
    setPendingAnalyzeSymbol(symbol);
    setActiveTab('analyze');
    setShowResult(false);
  };

  // Shared navigation (used by sidebar + command palette)
  const navigate = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'analyze') setShowResult(false);
  };

  const dir = language === 'he' ? 'rtl' : 'ltr';

  return (
    <div dir={dir} className={`app-container has-hud theme-${theme}`}>
      <ThemeBackground />
      <SyncManager onSynced={() => setRefreshKey(k => k + 1)} />
      <TopBar language={language} theme={theme} refreshKey={refreshKey} />
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={navigate}
        language={language}
        onToggleLang={toggleLanguage}
        theme={theme}
        onThemeChange={handleThemeChange}
      />
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard language={language} onNavigate={setActiveTab} onViewAnalysis={handleViewAnalysis} refreshKey={refreshKey} />
        )}
        {activeTab === 'analyze' && !showResult && (
          <AnalyzeForm
            language={language}
            onResult={handleResult}
            prefillSymbol={pendingAnalyzeSymbol}
            onClearPrefill={() => setPendingAnalyzeSymbol('')}
            onLimitReached={() => {
              showToast(language === 'he' ? '⚠️ נגמרה המכסה החודשית — שדרג מסלול' : '⚠️ Monthly limit reached — upgrade your plan', 'error');
              setActiveTab('plans');
            }}
          />
        )}
        {activeTab === 'analyze' && showResult && currentResult && (
          <AnalysisResultView
            language={language}
            result={currentResult}
            stockData={currentStockData}
            news={currentNews}
            stockName={currentStockName}
            imageBase64={currentImageBase64}
            onBack={() => setShowResult(false)}
            onPaperTrade={(ok) => {
              setRefreshKey(k => k + 1);
              showToast(
                ok ? (language === 'he' ? '✅ פוזיציית דמו נפתחה!' : '✅ Paper position opened!')
                   : (language === 'he' ? '⚠️ אין מספיק מזומן וירטואלי.' : '⚠️ Not enough virtual cash.'),
                ok ? 'success' : 'error'
              );
            }}
          />
        )}
        {activeTab === 'portfolio' && (
          <Portfolio language={language} refreshKey={refreshKey} />
        )}
        {activeTab === 'plans' && (
          <Plans language={language} onChanged={() => { setRefreshKey(k => k + 1); showToast(language === 'he' ? '✅ המסלול עודכן!' : '✅ Plan updated!', 'success'); }} />
        )}
        {activeTab === 'history' && (
          <History language={language} onViewAnalysis={handleViewAnalysis} refreshKey={refreshKey} />
        )}
        {activeTab === 'journal' && (
          <Journal language={language} refreshKey={refreshKey} />
        )}
        {activeTab === 'watchlist' && (
          <Watchlist language={language} onAnalyze={handleWatchlistAnalyze} />
        )}
      </main>
      <StatusBar language={language} theme={theme} activeTab={activeTab} />
      <CommandPalette
        language={language}
        onNavigate={navigate}
        onToggleLang={toggleLanguage}
        onThemeChange={handleThemeChange}
      />
      {booting && <BootSequence language={language} onDone={finishBoot} />}
    </div>
  );
}
