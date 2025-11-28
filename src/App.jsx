import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Plus, 
  Activity, 
  Menu, 
  X, 
  RefreshCw,
  BarChart3,
  Settings,
  AlertCircle,
  Calendar,
  ExternalLink,
  Briefcase,
  Edit,
  Trash2,
  PieChart,
  DollarSign,
  Wallet,
  ArrowRightLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  History, 
  ChevronRight,
  Calculator,
  Maximize2,
  RotateCcw,
  MoveHorizontal,
  MoveVertical,
  MousePointer2,
  Gift,
  Newspaper,
  Loader2,
  Wifi,
  WifiOff,
  Layers,
  AlertTriangle,
  Globe,
  Home,
  BarChart2
} from 'lucide-react';

// --- 系統設定與預設資料 ---

// 用於初始化 LocalStorage 的預設資料 (當使用者第一次開啟時顯示)
const DEMO_DATA = {
  positions: {
    'NVDA': { shares: 10, cost: 450.00, zeroCost: { shares: 2, faceValue: 0 } },
    'TSLA': { shares: 25, cost: 210.50 },
    'AAPL': { shares: 50, cost: 145.20 }
  },
  cash: 50000,
  transactions: [
    { id: 'tx_1', date: new Date(Date.now() - 86400000 * 5).toISOString(), type: 'deposit', amount: 60000, balance: 60000 },
    { id: 'tx_2', date: new Date(Date.now() - 86400000 * 4).toISOString(), type: 'buy', symbol: 'AAPL', shares: 50, price: 145.20, amount: 7260, balance: 52740 },
    { id: 'tx_3', date: new Date(Date.now() - 86400000 * 2).toISOString(), type: 'buy', symbol: 'NVDA', shares: 10, price: 450.00, amount: 4500, balance: 48240 },
  ]
};

// 模擬新聞數據
const MOCK_NEWS = {
  'DEFAULT': [
    { id: 1, category: 'Market', datetime: Date.now() - 3600000, headline: '聯準會暗示今年可能降息三次', source: 'MarketWatch', url: '#' },
    { id: 2, category: 'Economy', datetime: Date.now() - 7200000, headline: '美國就業數據優於預期', source: 'Bloomberg', url: '#' },
    { id: 3, category: 'Tech', datetime: Date.now() - 10800000, headline: '科技股領漲，那斯達克指數創新高', source: 'CNBC', url: '#' },
  ]
};

const INITIAL_MARKET_DATA = [
  { symbol: 'NVDA', name: 'NVIDIA Corp', price: 880.08, change: 1.2 },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 175.79, change: 2.1 },
  { symbol: 'AAPL', name: 'Apple Inc.', price: 170.12, change: -0.5 },
];

/**
 * 模擬數據生成函數
 */
const generateCandleData = (targetEndPrice, days = 120) => {
  let price = 100;
  const rawData = [];
  
  for (let i = 0; i < days; i++) {
    const volatility = 0.025; 
    const changePercent = (Math.random() - 0.48) * volatility;
    
    const open = price;
    const close = price * (1 + changePercent);
    const high = Math.max(open, close) * (1 + Math.random() * 0.015);
    const low = Math.min(open, close) * (1 - Math.random() * 0.015);
    
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const dateStr = date.toISOString().split('T')[0];

    rawData.push({
      t: dateStr,
      o: open,
      h: high,
      l: low,
      c: close
    });
    
    price = close;
  }

  const finalClose = rawData[rawData.length - 1].c;
  const scaleRatio = targetEndPrice / finalClose;

  return rawData.map(d => ({
    t: d.t,
    o: parseFloat((d.o * scaleRatio).toFixed(2)),
    h: parseFloat((d.h * scaleRatio).toFixed(2)),
    l: parseFloat((d.l * scaleRatio).toFixed(2)),
    c: parseFloat((d.c * scaleRatio).toFixed(2))
  }));
};

// 計算移動平均線 (SMA)
const calculateSMA = (data, window) => {
  if (!data || data.length < window) return [];
  return data.map((item, index) => {
    if (index < window - 1) return { t: item.t, v: null };
    const slice = data.slice(index - window + 1, index + 1);
    const sum = slice.reduce((acc, curr) => acc + curr.c, 0);
    return { t: item.t, v: sum / window };
  });
};

const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '$--';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val);
};

const formatPercent = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '--%';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
};

const formatDate = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleString('zh-TW', { 
    month: 'numeric', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.slice(5); 
};

// --- API 工具 ---

const fetchFinnhubCandles = async (symbol, apiKey) => {
  try {
    const end = Math.floor(Date.now() / 1000);
    const start = end - (180 * 24 * 60 * 60); 
    
    const response = await fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${start}&to=${end}&token=${apiKey}`);
    
    if (!response.ok) {
        if (response.status === 429) return { error: 'Finnhub 限流 (429)' };
        return { error: `Finnhub 錯誤 (${response.status})` };
    }
    
    const data = await response.json();
    if (data.s === 'no_data') return { error: '無數據' };
    if (data.s !== 'ok') return { error: '數據格式錯誤' };

    const candles = data.t.map((timestamp, index) => ({
      t: new Date(timestamp * 1000).toISOString().split('T')[0],
      o: data.o[index],
      h: data.h[index],
      l: data.l[index],
      c: data.c[index]
    }));

    return { success: true, data: candles };
  } catch (error) {
    return { error: '網絡錯誤' };
  }
};

const fetchYahooCandles = async (symbol) => {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=6mo&interval=1d`;
    
    const proxyGenerators = [
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    ];

    for (const generator of proxyGenerators) {
        try {
            const proxyUrl = generator(yahooUrl);
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                console.warn(`Proxy failed: ${proxyUrl} (${response.status})`);
                continue; 
            }

            const json = await response.json();
            const result = json.chart?.result?.[0];
            
            if (!result) continue; 
            
            const quote = result.indicators.quote[0];
            const timestamps = result.timestamp;
            
            if (!timestamps || !quote) continue;

            const candles = [];
            for (let i = 0; i < timestamps.length; i++) {
                if (quote.open[i] === null || quote.close[i] === null) continue;

                candles.push({
                    t: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                    o: parseFloat(quote.open[i].toFixed(2)),
                    h: parseFloat(quote.high[i].toFixed(2)),
                    l: parseFloat(quote.low[i].toFixed(2)),
                    c: parseFloat(quote.close[i].toFixed(2)),
                });
            }

            return { 
                success: true, 
                data: candles, 
                price: result.meta.regularMarketPrice, 
                change: result.meta.regularMarketChangePercent 
            };

        } catch (error) {
            console.warn("Yahoo fetch attempt failed:", error);
        }
    }

    return { error: 'Proxy 連線逾時或失敗' };
};

const fetchStockQuoteFinnhub = async (symbol, apiKey) => {
  try {
    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.c === 0 && data.d === null) return null;
    return { price: data.c, change: data.dp };
  } catch (error) {
    return null;
  }
};

const fetchCompanyNews = async (symbol, apiKey, dataSource) => {
  // 若使用 Yahoo 或無 Key
  if (dataSource === 'YAHOO' || !apiKey) {
      try {
        const yahooUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${symbol}`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Yahoo News Network Error');
        
        const data = await response.json();
        
        if (data.news && data.news.length > 0) {
            return data.news.slice(0, 5).map(item => ({
                id: item.uuid,
                category: 'News',
                datetime: item.providerPublishTime * 1000,
                headline: item.title,
                source: item.publisher,
                url: item.link
            }));
        }
      } catch (error) {
        // Silent fail
      }
  }

  // 若使用 Finnhub 且有 Key
  if (dataSource === 'FINNHUB' && apiKey) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        
        const response = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${weekAgo}&to=${today}&token=${apiKey}`);
        if (!response.ok) return null;
        
        const data = await response.json();
        return data.slice(0, 5);
      } catch (error) {
        return null;
      }
  }
  
  return null;
};

// --- Dashboard 組件 ---
const DashboardView = ({ positions, stocks, cash, totalEquity, totalMarketValue, onSelectStock }) => {
    // 計算總體未實現損益與預估當日變動
    const portfolioStats = useMemo(() => {
        let totalCost = 0;
        let dayChange = 0;

        Object.keys(positions).forEach(symbol => {
            const pos = positions[symbol];
            const stock = stocks.find(s => s.symbol === symbol);
            if(stock) {
                totalCost += pos.shares * pos.cost;
                // 估算當日損益: (現價 - 昨日收盤) * 總股數 (含零成本)
                const prevClose = stock.price / (1 + (stock.change / 100));
                const totalShares = pos.shares + (pos.zeroCost?.shares || 0);
                dayChange += (stock.price - prevClose) * totalShares;
            }
        });

        const totalUnrealizedPL = totalMarketValue - totalCost;
        const totalReturnRate = totalCost > 0 ? (totalUnrealizedPL / totalCost) * 100 : 0;

        return { totalUnrealizedPL, totalReturnRate, dayChange };
    }, [positions, stocks, totalMarketValue]);

    // 排序持倉表現
    const sortedHoldings = useMemo(() => {
        const list = Object.keys(positions).map(symbol => {
            const stock = stocks.find(s => s.symbol === symbol) || { price: 0, change: 0 };
            const pos = positions[symbol];
            const marketVal = (pos.shares + (pos.zeroCost?.shares || 0)) * stock.price;
            const costVal = pos.shares * pos.cost;
            const pl = marketVal - costVal;
            const plPercent = costVal > 0 ? (pl / costVal) * 100 : 0;
            return { symbol, pl, plPercent, price: stock.price, change: stock.change };
        });
        return list.sort((a, b) => b.pl - a.pl); 
    }, [positions, stocks]);

    // 取得零成本持倉列表 (需求2)
    const zeroCostHoldings = useMemo(() => {
        return Object.keys(positions)
            .filter(symbol => positions[symbol].zeroCost && positions[symbol].zeroCost.shares > 0)
            .map(symbol => {
                const stock = stocks.find(s => s.symbol === symbol) || { price: 0 };
                const zc = positions[symbol].zeroCost;
                return {
                    symbol,
                    shares: zc.shares,
                    faceValue: zc.faceValue,
                    marketValue: zc.shares * stock.price,
                    price: stock.price
                };
            })
            .sort((a, b) => b.marketValue - a.marketValue);
    }, [positions, stocks]);

    return (
        <div className="p-4 md:p-6 lg:p-10 max-w-6xl mx-auto w-full space-y-6 md:space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">投資總覽 Dashboard</h2>
                <p className="text-slate-400 text-sm">歡迎回來，您的資產數據已自本地儲存載入</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-4 md:p-6 rounded-xl shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Briefcase size={80}/></div>
                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">總資產 (Total Equity)</div>
                    <div className="text-2xl md:text-3xl font-mono font-bold text-white mb-2">{formatCurrency(totalEquity)}</div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="bg-slate-700/50 px-2 py-0.5 rounded text-slate-300">現金: {formatCurrency(cash)}</span>
                        <span className="bg-indigo-900/30 px-2 py-0.5 rounded text-indigo-300">股票: {formatCurrency(totalMarketValue)}</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-4 md:p-6 rounded-xl shadow-lg relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={80}/></div>
                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">未實現損益 (Unrealized P/L)</div>
                    <div className={`text-2xl md:text-3xl font-mono font-bold mb-2 ${portfolioStats.totalUnrealizedPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {portfolioStats.totalUnrealizedPL >= 0 ? '+' : ''}{formatCurrency(portfolioStats.totalUnrealizedPL)}
                    </div>
                    <div className={`text-sm font-bold flex items-center gap-1 ${portfolioStats.totalUnrealizedPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {formatPercent(portfolioStats.totalReturnRate)} 總報酬
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-4 md:p-6 rounded-xl shadow-lg relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={80}/></div>
                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">當日預估損益 (Day Change)</div>
                    <div className={`text-2xl md:text-3xl font-mono font-bold mb-2 ${portfolioStats.dayChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {portfolioStats.dayChange >= 0 ? '+' : ''}{formatCurrency(portfolioStats.dayChange)}
                    </div>
                    <div className="text-xs text-slate-500">
                        * 根據當前漲跌幅估算
                    </div>
                </div>
            </div>

            {/* 持倉排行與圖表 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* 左側：資產配置 */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                         <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><PieChart size={16} className="text-indigo-400"/> 資產分佈</h3>
                         <AllocationChart positions={positions} stocks={stocks} cash={cash} />
                    </div>
                    
                    {/* 新增: 零成本庫存區塊 (需求2) */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <h3 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2"><Gift size={16} /> 零成本 / 獲利股庫存</h3>
                        {zeroCostHoldings.length > 0 ? (
                            <div className="space-y-3">
                                {zeroCostHoldings.map(item => (
                                    <div key={item.symbol} className="flex justify-between items-center border-b border-slate-800/50 pb-2 last:border-0 last:pb-0" onClick={() => onSelectStock(item.symbol)}>
                                        <div>
                                            <div className="font-bold text-white text-sm">{item.symbol}</div>
                                            <div className="text-xs text-slate-500">{item.shares} 股</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-emerald-400 text-sm">+{formatCurrency(item.marketValue)}</div>
                                            <div className="text-[10px] text-slate-600">面額: {formatCurrency(item.faceValue)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-slate-600 text-xs">
                                尚無零成本庫存
                            </div>
                        )}
                    </div>
                </div>

                {/* 右側：表現排行 */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><TrophyIcon size={16} className="text-amber-400"/> 持倉表現排行</h3>
                    
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[300px]">
                            <thead>
                                <tr className="text-xs text-slate-500 border-b border-slate-800">
                                    <th className="pb-2 font-medium pl-2">代號</th>
                                    <th className="pb-2 font-medium text-right">現價</th>
                                    <th className="pb-2 font-medium text-right">總損益</th>
                                    <th className="pb-2 font-medium text-right pr-2">報酬率</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {sortedHoldings.map((item) => (
                                    <tr key={item.symbol} className="group hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => onSelectStock(item.symbol)}>
                                        <td className="py-3 pl-2 font-bold text-white flex items-center gap-2">
                                            {item.symbol}
                                            {item.change >= 0 ? <TrendingUp size={12} className="text-emerald-500"/> : <TrendingDown size={12} className="text-rose-500"/>}
                                        </td>
                                        <td className="py-3 text-right font-mono text-slate-300">{formatCurrency(item.price)}</td>
                                        <td className={`py-3 text-right font-mono font-medium ${item.pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {item.pl >= 0 ? '+' : ''}{formatCurrency(item.pl)}
                                        </td>
                                        <td className={`py-3 pr-2 text-right font-mono ${item.plPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {formatPercent(item.plPercent)}
                                        </td>
                                    </tr>
                                ))}
                                {sortedHoldings.length === 0 && (
                                    <tr><td colSpan="4" className="py-4 text-center text-slate-500">尚無持倉數據</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TrophyIcon = ({size, className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);


// --- K線圖組件 ---
const CandleChart = ({ data, avgCost, dataStatus, onRetry, dataSource }) => {
  const containerRef = useRef(null);
  const [hoverInfo, setHoverInfo] = useState(null);

  const [visibleCount, setVisibleCount] = useState(60); 
  const [offsetEnd, setOffsetEnd] = useState(0); 
  const [yScalePadding, setYScalePadding] = useState(0.1); 
  
  const [showMA5, setShowMA5] = useState(true);
  const [showMA20, setShowMA20] = useState(true);
  const [showMA60, setShowMA60] = useState(false);

  const [dragState, setDragState] = useState({ 
    isDragging: false, 
    mode: null, 
    startX: 0, 
    startY: 0,
    startOffset: 0,
    startVisibleCount: 0,
    startPadding: 0
  });

  useEffect(() => {
    setVisibleCount(60);
    setOffsetEnd(0);
    setYScalePadding(0.1);
  }, [data]);

  const ma5Data = useMemo(() => calculateSMA(data, 5), [data]);
  const ma20Data = useMemo(() => calculateSMA(data, 20), [data]);
  const ma60Data = useMemo(() => calculateSMA(data, 60), [data]);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 md:h-80 flex flex-col items-center justify-center text-slate-600 bg-slate-900/30 rounded-xl border border-slate-800 border-dashed">
        <BarChart3 className="mb-2 opacity-50" />
        <span className="text-sm">暫無 K 線資料</span>
      </div>
    );
  }

  const totalCount = data.length;
  const safeVisibleCount = Math.max(10, Math.min(visibleCount, totalCount));
  const maxOffset = Math.max(0, totalCount - safeVisibleCount);
  const safeOffsetEnd = Math.max(0, Math.min(offsetEnd, maxOffset));

  const startIndex = Math.max(0, totalCount - safeVisibleCount - safeOffsetEnd);
  const endIndex = Math.min(totalCount, startIndex + safeVisibleCount);
  
  const visibleData = data.slice(startIndex, endIndex);
  const visibleMA5 = ma5Data.slice(startIndex, endIndex);
  const visibleMA20 = ma20Data.slice(startIndex, endIndex);
  const visibleMA60 = ma60Data.slice(startIndex, endIndex);

  const handleMouseDown = (e, mode) => {
    e.preventDefault();
    setDragState({
      isDragging: true,
      mode: mode,
      startX: e.clientX,
      startY: e.clientY,
      startOffset: safeOffsetEnd,
      startVisibleCount: safeVisibleCount,
      startPadding: yScalePadding
    });
  };

  const handleMouseMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    if (!dragState.isDragging || dragState.mode === 'pan') {
       const chartWidth = rect.width - 48;
       const x = e.clientX - rect.left;
       if (x >= 0 && x <= chartWidth && visibleData.length > 0) {
          const index = Math.min(Math.max(Math.floor((x / chartWidth) * visibleData.length), 0), visibleData.length - 1);
          setHoverInfo({ 
              data: visibleData[index],
              ma5: visibleMA5[index]?.v,
              ma20: visibleMA20[index]?.v,
              ma60: visibleMA60[index]?.v,
              x: (index / visibleData.length) * chartWidth + (chartWidth / visibleData.length / 2) 
          });
       } else {
          setHoverInfo(null);
       }
    }
    if (dragState.isDragging) {
        const diffX = e.clientX - dragState.startX;
        const diffY = e.clientY - dragState.startY;
        if (dragState.mode === 'pan') {
            const chartWidth = rect.width - 48;
            const candleWidth = chartWidth / safeVisibleCount;
            const candlesMoved = Math.round(diffX / candleWidth);
            setOffsetEnd(dragState.startOffset + candlesMoved);
        } else if (dragState.mode === 'zoomX') {
            const sensitivity = 0.5;
            const deltaCount = Math.round(-diffX * sensitivity);
            setVisibleCount(dragState.startVisibleCount + deltaCount);
        } else if (dragState.mode === 'zoomY') {
            const sensitivity = 0.005;
            const newPadding = Math.max(0.01, Math.min(0.45, dragState.startPadding - (diffY * sensitivity)));
            setYScalePadding(newPadding);
        }
    }
  };

  const handleMouseUp = () => setDragState(prev => ({ ...prev, isDragging: false, mode: null }));
  const handleMouseLeave = () => {
    setDragState(prev => ({ ...prev, isDragging: false, mode: null }));
    setHoverInfo(null);
  };

  let prices = visibleData.flatMap(d => [d.h, d.l]);
  if (showMA5) prices = [...prices, ...visibleMA5.map(d => d.v).filter(v => v)];
  if (showMA20) prices = [...prices, ...visibleMA20.map(d => d.v).filter(v => v)];
  if (showMA60) prices = [...prices, ...visibleMA60.map(d => d.v).filter(v => v)];

  let minPrice = Math.min(...prices);
  let maxPrice = Math.max(...prices);
  if (avgCost) {
      minPrice = Math.min(minPrice, avgCost);
      maxPrice = Math.max(maxPrice, avgCost);
  }
  const rawRange = maxPrice - minPrice || 1;
  const range = rawRange > 0 ? rawRange : 1;
  const yMax = maxPrice + (range * yScalePadding);
  const yMin = minPrice - (range * yScalePadding);
  const yRange = yMax - yMin;
  const getY = (price) => ((yMax - price) / yRange) * 100;

  const generateMAPath = (maData) => maData.map((d, i) => {
    if (!d.v) return null;
    const x = (i / visibleData.length) * 100 + (100 / visibleData.length / 2);
    const y = getY(d.v);
    return `${x} ${y}`;
  }).filter(Boolean).join(' L ');

  const ma5Path = showMA5 ? generateMAPath(visibleMA5) : '';
  const ma20Path = showMA20 ? generateMAPath(visibleMA20) : '';
  const ma60Path = showMA60 ? generateMAPath(visibleMA60) : '';

  let costY = null;
  if (avgCost && yRange > 0) {
    const rawY = getY(avgCost);
    if (rawY >= -10 && rawY <= 110) costY = Math.max(0, Math.min(100, rawY));
  }

  const startDate = visibleData.length > 0 ? visibleData[0].t : '';
  const endDate = visibleData.length > 0 ? visibleData[visibleData.length-1].t : '';
  const isReal = dataStatus === 'REAL';
  const errorMsg = dataStatus !== 'REAL' && dataStatus !== 'MOCK' ? dataStatus : null;

  return (
    <div className="relative group/chart select-none" ref={containerRef} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}>
        <div className="absolute top-2 left-2 z-40 flex flex-col items-start gap-2">
            {isReal ? (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-900/50 backdrop-blur border border-emerald-700/50 rounded-md text-[10px] text-emerald-200 shadow-sm">
                    {dataSource === 'YAHOO' ? <Globe size={12} /> : <Wifi size={12} />} 
                    {dataSource === 'YAHOO' ? 'Yahoo Finance (Proxy)' : 'Finnhub Realtime'}
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-900/60 backdrop-blur border border-amber-700/50 rounded-md text-[10px] text-amber-200 shadow-sm" title={errorMsg || "目前顯示模擬走勢"}>
                        {errorMsg ? <AlertTriangle size={12} /> : <WifiOff size={12} />} 
                        {errorMsg ? `模擬: ${errorMsg}` : "模擬數據 (Simulation)"}
                    </div>
                    <button onClick={onRetry} className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 transition-colors shadow-sm"><RefreshCw size={12} /></button>
                </div>
            )}
            <div className="flex items-center gap-1 bg-slate-900/70 backdrop-blur p-1 rounded-md border border-slate-700/50 shadow-sm">
                <button onClick={() => setShowMA5(!showMA5)} className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${showMA5 ? 'bg-yellow-500/20 text-yellow-400 font-bold' : 'text-slate-500 hover:text-slate-300'}`}>MA5</button>
                <button onClick={() => setShowMA20(!showMA20)} className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${showMA20 ? 'bg-purple-500/20 text-purple-400 font-bold' : 'text-slate-500 hover:text-slate-300'}`}>MA20</button>
                <button onClick={() => setShowMA60(!showMA60)} className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${showMA60 ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-slate-500 hover:text-slate-300'}`}>MA60</button>
            </div>
        </div>
        <div className="absolute top-2 right-14 z-40 flex items-center gap-2 opacity-0 group-hover/chart:opacity-100 transition-opacity duration-200">
             {offsetEnd !== 0 && (
                <button onClick={() => { setOffsetEnd(0); setVisibleCount(60); setYScalePadding(0.1); }} className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow-lg transition-colors flex items-center gap-1 text-xs px-2">
                    <RotateCcw size={12} /> 重置視角
                </button>
             )}
        </div>
        {/* Height changed for mobile optimization */}
        <div className="flex flex-col h-64 md:h-80 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex flex-1 relative min-h-0">
                <div className={`flex-1 relative overflow-hidden ${dragState.isDragging && dragState.mode === 'pan' ? 'cursor-grabbing' : 'cursor-grab'}`} onMouseDown={(e) => handleMouseDown(e, 'pan')}>
                    {costY !== null && (
                        <div className="absolute left-0 right-0 border-t-2 border-dashed border-slate-400/50 z-0 flex items-center justify-end pointer-events-none" style={{ top: `${costY}%` }}>
                            <span className="bg-slate-700/80 text-white text-[10px] px-1 py-0.5 rounded mr-2 backdrop-blur-sm shadow-sm">Cost: {avgCost.toFixed(2)}</span>
                        </div>
                    )}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                        {showMA60 && ma60Path && <path d={`M ${ma60Path}`} fill="none" stroke="#3b82f6" strokeWidth="0.3" vectorEffect="non-scaling-stroke" opacity="0.8" />}
                        {showMA20 && ma20Path && <path d={`M ${ma20Path}`} fill="none" stroke="#a855f7" strokeWidth="0.4" vectorEffect="non-scaling-stroke" opacity="0.8" />}
                        {showMA5 && ma5Path && <path d={`M ${ma5Path}`} fill="none" stroke="#eab308" strokeWidth="0.4" vectorEffect="non-scaling-stroke" opacity="0.9" />}
                    </svg>
                    <div className="absolute inset-0 flex items-end px-1 pointer-events-none">
                        {visibleData.map((candle, i) => {
                            const isUp = candle.c >= candle.o;
                            const color = isUp ? '#10B981' : '#EF4444';
                            const yHigh = getY(candle.h);
                            const yLow = getY(candle.l);
                            const yOpen = getY(candle.o);
                            const yClose = getY(candle.c);
                            const barTop = Math.min(yOpen, yClose);
                            const barHeight = Math.abs(yOpen - yClose) || 0.5;
                            return (
                                <div key={i} className="flex-1 relative h-full mx-[1px] group/candle">
                                    <div className="absolute left-1/2 -translate-x-1/2 w-[1px]" style={{ top: `${yHigh}%`, height: `${Math.abs(yLow - yHigh)}%`, backgroundColor: color, opacity: 0.8 }} />
                                    <div className="absolute left-0 right-0" style={{ top: `${barTop}%`, height: `${barHeight}%`, backgroundColor: color }} />
                                </div>
                            );
                        })}
                    </div>
                    {hoverInfo && (
                        <>
                        <div className="absolute top-0 bottom-0 w-[1px] bg-slate-500/50 border-r border-dashed border-slate-600 pointer-events-none z-30" style={{ left: hoverInfo.x }} />
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur-md border border-slate-600 p-2 rounded text-xs shadow-xl z-30 pointer-events-none whitespace-nowrap flex gap-4">
                            <div className="text-left">
                                <div className="text-slate-400 font-bold mb-1 border-b border-slate-700 pb-1">{hoverInfo.data.t}</div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono">
                                    <span className="text-slate-400">O:</span> <span className="text-white text-right">{hoverInfo.data.o}</span>
                                    <span className="text-slate-400">H:</span> <span className="text-white text-right">{hoverInfo.data.h}</span>
                                    <span className="text-slate-400">L:</span> <span className="text-white text-right">{hoverInfo.data.l}</span>
                                    <span className="text-slate-400">C:</span> <span className={hoverInfo.data.c >= hoverInfo.data.o ? 'text-emerald-400 text-right' : 'text-rose-400 text-right'}>{hoverInfo.data.c}</span>
                                </div>
                            </div>
                            {(showMA5 || showMA20 || showMA60) && (
                                <div className="border-l border-slate-700 pl-4 flex flex-col justify-center gap-1 font-mono">
                                    {showMA5 && <div className="text-yellow-400">MA5: {hoverInfo.ma5 ? hoverInfo.ma5.toFixed(2) : '-'}</div>}
                                    {showMA20 && <div className="text-purple-400">MA20: {hoverInfo.ma20 ? hoverInfo.ma20.toFixed(2) : '-'}</div>}
                                    {showMA60 && <div className="text-blue-400">MA60: {hoverInfo.ma60 ? hoverInfo.ma60.toFixed(2) : '-'}</div>}
                                </div>
                            )}
                        </div>
                        </>
                    )}
                </div>
                <div className="w-12 border-l border-slate-800 bg-slate-900/50 flex flex-col justify-between py-2 text-[10px] text-slate-500 font-mono text-right pr-1 cursor-ns-resize hover:bg-slate-800/80 transition-colors z-20" onMouseDown={(e) => handleMouseDown(e, 'zoomY')}>
                    <span>{yMax.toFixed(0)}</span>
                    <span className="opacity-50 text-[8px] text-center pr-0"><MoveVertical size={10} className="inline"/></span>
                    <span>{yMin.toFixed(0)}</span>
                </div>
            </div>
            <div className="h-6 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center px-2 text-[10px] text-slate-500 font-mono cursor-ew-resize hover:bg-slate-800/80 transition-colors z-20" onMouseDown={(e) => handleMouseDown(e, 'zoomX')}>
                <span>{formatDateShort(startDate)}</span>
                <span className="flex items-center gap-1 opacity-50"><MoveHorizontal size={12}/> 拖曳縮放</span>
                <span>{formatDateShort(endDate)}</span>
            </div>
        </div>
    </div>
  );
};

// --- 資產配置圓餅圖 ---
const AllocationChart = ({ positions, stocks, cash }) => {
    const data = useMemo(() => {
        let total = cash;
        const segments = [{ id: 'Cash', value: cash, color: '#10b981', label: 'Cash' }];
        Object.keys(positions).forEach((symbol, idx) => {
            const stock = stocks.find(s => s.symbol === symbol);
            if(stock) {
                const pos = positions[symbol];
                const value = (pos.shares * stock.price) + (pos.zeroCost?.shares * stock.price || 0);
                total += value;
                const hue = (idx * 137.5) % 360; 
                segments.push({ id: symbol, value, color: `hsl(${hue}, 70%, 60%)`, label: symbol });
            }
        });
        segments.sort((a, b) => b.value - a.value);
        return { total, segments };
    }, [positions, stocks, cash]);

    let accumulatedAngle = 0;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="flex flex-col items-center bg-slate-800/30 p-4 rounded-xl border border-slate-800">
             <div className="flex items-center gap-2 mb-3 w-full text-xs text-slate-400 font-bold uppercase tracking-wider">
                <PieChart size={14} /> 資產配置 (Allocation)
             </div>
             <div className="flex items-center w-full gap-4">
                 <div className="relative w-24 h-24 flex-shrink-0">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                        {data.segments.map((seg, i) => {
                            const percent = seg.value / data.total;
                            const strokeDasharray = `${percent * circumference} ${circumference}`;
                            const strokeDashoffset = -accumulatedAngle * circumference;
                            accumulatedAngle += percent;
                            return (
                                <circle key={seg.id} cx="50" cy="50" r={radius} fill="transparent" stroke={seg.color} strokeWidth="15" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} className="transition-all duration-500 ease-out" />
                            );
                        })}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col"><span className="text-[10px] text-slate-500">Total</span></div>
                 </div>
                 <div className="flex-1 space-y-1.5 overflow-hidden">
                     {data.segments.slice(0, 4).map(seg => (
                         <div key={seg.id} className="flex items-center justify-between text-xs">
                             <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }}></div><span className="text-slate-300 font-medium">{seg.label}</span></div>
                             <span className="text-slate-500 font-mono">{((seg.value / data.total) * 100).toFixed(1)}%</span>
                         </div>
                     ))}
                     {data.segments.length > 4 && <div className="text-[10px] text-slate-600 text-center pt-1">+ {data.segments.length - 4} others</div>}
                 </div>
             </div>
        </div>
    );
};

// --- Settings Modal ---
const SettingsModal = ({ isOpen, onClose, apiKey, setApiKey, dataSource, setDataSource }) => {
  const [localKey, setLocalKey] = useState(apiKey);
  const [localSource, setLocalSource] = useState(dataSource);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 md:p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={20} className="text-indigo-400" /> 資料設定</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
        </div>
        <div className="space-y-4">
          <div className="text-sm text-slate-300">請選擇您的資料來源。若無 API Key，可嘗試使用 Yahoo Finance (透過公開 Proxy 連線)。</div>
          <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">資料來源</label>
              <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setLocalSource('FINNHUB')} className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${localSource === 'FINNHUB' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                      <Wifi size={20} /><span className="text-xs font-bold">Finnhub API</span>
                  </button>
                  <button onClick={() => setLocalSource('YAHOO')} className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${localSource === 'YAHOO' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                      <Globe size={20} /><span className="text-xs font-bold">Yahoo Finance</span>
                  </button>
              </div>
          </div>
          {localSource === 'FINNHUB' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-slate-400 mb-1">Finnhub API Key</label>
                <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-600" placeholder="輸入您的 Finnhub Key" value={localKey} onChange={(e) => setLocalKey(e.target.value)} />
                <a href="https://finnhub.io/register" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 inline-flex items-center gap-1">取得免費 Key <ExternalLink size={10} /></a>
              </div>
          )}
          {localSource === 'YAHOO' && (
              <div className="p-3 bg-amber-900/20 border border-amber-900/50 rounded-lg text-amber-200 text-xs animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2 mb-1 font-bold"><AlertTriangle size={14}/> 注意</div>
                  Yahoo Finance 數據是透過公開的 CORS Proxy (allorigins) 轉發。連線速度可能較慢，且穩定性取決於 Proxy 服務狀況。
              </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">返回</button>
          <button onClick={() => { setApiKey(localKey.trim()); setDataSource(localSource); onClose(); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">儲存設定</button>
        </div>
      </div>
    </div>
  );
};

// --- History Modal ---
const HistoryModal = ({ isOpen, onClose, transactions }) => {
  if (!isOpen) return null;
  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const getIcon = (type) => {
    switch (type) {
      case 'buy': return <ArrowDownCircle className="text-rose-500" size={20} />;
      case 'sell': return <ArrowUpCircle className="text-emerald-500" size={20} />;
      case 'deposit': return <TrendingUp className="text-emerald-500" size={20} />;
      case 'withdraw': return <TrendingDown className="text-rose-500" size={20} />;
      default: return <Activity size={20} />;
    }
  };
  const getLabel = (type) => {
    switch (type) {
        case 'buy': return '買入股票';
        case 'sell': return '賣出股票';
        case 'deposit': return '現金入金';
        case 'withdraw': return '現金出金';
        default: return type;
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 rounded-t-xl z-10">
          <h3 className="text-xl font-bold text-white flex items-center gap-2"><History size={20} className="text-indigo-400" /> 交易歷史回顧</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
           {sortedTransactions.length === 0 ? <div className="text-center py-12 text-slate-500">尚無交易紀錄</div> : sortedTransactions.map((tx) => (
               <div key={tx.id} className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/60 transition-colors">
                   <div className="flex items-start gap-4">
                       <div className="mt-1 bg-slate-900 p-2 rounded-full border border-slate-700">{getIcon(tx.type)}</div>
                       <div>
                           <div className="font-bold text-white flex items-center gap-2">{getLabel(tx.type)} {tx.symbol && <span className="bg-indigo-900/50 text-indigo-300 text-xs px-2 py-0.5 rounded border border-indigo-500/30">{tx.symbol}</span>}</div>
                           <div className="text-xs text-slate-400 mt-1">{formatDate(tx.date)}</div>
                           {(tx.type === 'buy' || tx.type === 'sell') && <div className="text-xs text-slate-500 mt-1">{tx.shares} 股 @ {formatCurrency(tx.price)}</div>}
                       </div>
                   </div>
                   <div className="text-right pl-12 sm:pl-0">
                       <div className={`font-mono font-bold text-lg ${['deposit', 'sell'].includes(tx.type) ? 'text-emerald-400' : 'text-rose-400'}`}>{['deposit', 'sell'].includes(tx.type) ? '+' : '-'}{formatCurrency(tx.amount)}</div>
                       <div className="text-xs text-slate-500 mt-1">餘額: {formatCurrency(tx.balance)}</div>
                   </div>
               </div>
           ))}
        </div>
      </div>
    </div>
  );
};

// --- Wallet Modal ---
const WalletModal = ({ isOpen, onClose, cash, onTransaction }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('deposit');
  if (!isOpen) return null;
  const handleSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    if (type === 'withdraw' && val > cash) { alert('餘額不足'); return; }
    onTransaction(type, val);
    onClose();
    setAmount('');
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
       <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 md:p-6 w-full max-w-sm shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Wallet size={20} className="text-emerald-400" /> 資金管理</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
          </div>
          <div className="mb-6 p-4 bg-slate-800 rounded-lg text-center">
             <div className="text-slate-400 text-xs uppercase mb-1">當前可用現金</div>
             <div className="text-3xl font-mono font-bold text-white">{formatCurrency(cash)}</div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button type="button" onClick={() => setType('deposit')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${type === 'deposit' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>入金 (Deposit)</button>
                <button type="button" onClick={() => setType('withdraw')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${type === 'withdraw' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}>出金 (Withdraw)</button>
             </div>
             <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">金額</label>
                <input type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white text-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none" />
             </div>
             <button type="submit" className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${type === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'}`}>確認{type === 'deposit' ? '入金' : '出金'}</button>
          </form>
       </div>
    </div>
  );
};

// --- ZeroCost Modal ---
const ZeroCostModal = ({ isOpen, onClose, symbol, zeroCostData, onSave }) => {
  const [shares, setShares] = useState('');
  const [faceValue, setFaceValue] = useState('');
  useEffect(() => { if (isOpen) { setShares(zeroCostData ? zeroCostData.shares : ''); setFaceValue(zeroCostData ? zeroCostData.faceValue : ''); } }, [isOpen, zeroCostData]);
  if (!isOpen) return null;
  const handleSubmit = (e) => { e.preventDefault(); onSave(symbol, parseFloat(shares) || 0, parseFloat(faceValue) || 0); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 md:p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2"><Gift size={20} className="text-amber-400" /> 零成本 / 獲利股設定</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
        </div>
        <p className="text-xs text-slate-400 mb-4 bg-slate-800 p-3 rounded">在此記錄您利用交易獲利購入或獲贈的零成本股票。這部分將與您的主要交易倉位分開統計。</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">股數 (Shares)</label>
            <input type="number" step="any" min="0" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white text-lg font-mono focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="例如: 5" value={shares} onChange={(e) => setShares(e.target.value)} />
          </div>
          <div>
             <label className="block text-xs font-medium text-slate-400 mb-1">面額 / 參考價 (Face Value)</label>
             <input type="number" step="any" min="0" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white text-lg font-mono focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="例如: 10" value={faceValue} onChange={(e) => setFaceValue(e.target.value)} />
          </div>
          <button type="submit" className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-colors">儲存設定</button>
        </form>
      </div>
    </div>
  );
};

// --- Portfolio Editor Modal ---
const PortfolioEditorModal = ({ isOpen, onClose, cash, setCash, positions, setPositions }) => {
  const [localCash, setLocalCash] = useState(cash);
  const [localPositions, setLocalPositions] = useState(positions);
  useEffect(() => { if (isOpen) { setLocalCash(cash); setLocalPositions(JSON.parse(JSON.stringify(positions))); } }, [isOpen, cash, positions]);
  if (!isOpen) return null;
  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center"><h3 className="text-xl font-bold text-white flex items-center gap-2"><Edit size={20} className="text-indigo-400" /> 編輯資產</h3><button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button></div>
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                  <div>
                      <h4 className="text-sm font-bold text-emerald-400 mb-3 uppercase tracking-wider">現金餘額</h4>
                      <div className="flex items-center gap-3"><div className="p-2 bg-emerald-900/30 rounded text-emerald-400"><DollarSign size={20}/></div><input type="number" value={localCash} onChange={e => setLocalCash(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
                  </div>
                  <div>
                      <h4 className="text-sm font-bold text-indigo-400 mb-3 uppercase tracking-wider">持倉調整</h4>
                      <div className="space-y-3">
                          {Object.keys(localPositions).map(symbol => (
                              <div key={symbol} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                  <div className="flex justify-between items-center mb-2"><span className="font-bold text-white">{symbol}</span><button onClick={() => { const next = {...localPositions}; delete next[symbol]; setLocalPositions(next); }} className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"><Trash2 size={12}/> 刪除</button></div>
                                  <div className="grid grid-cols-2 gap-3">
                                      <div><label className="text-[10px] text-slate-500 uppercase block mb-1">股數 (Shares)</label><input type="number" value={localPositions[symbol].shares} onChange={(e) => setLocalPositions(prev => ({...prev, [symbol]: {...prev[symbol], shares: parseFloat(e.target.value)||0}}))} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono focus:border-indigo-500 outline-none" /></div>
                                      <div><label className="text-[10px] text-slate-500 uppercase block mb-1">平均成本 (Avg Cost)</label><input type="number" value={localPositions[symbol].cost} onChange={(e) => setLocalPositions(prev => ({...prev, [symbol]: {...prev[symbol], cost: parseFloat(e.target.value)||0}}))} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono focus:border-indigo-500 outline-none" /></div>
                                  </div>
                              </div>
                          ))}
                          {Object.keys(localPositions).length === 0 && <div className="text-center text-slate-500 text-sm py-4">無持倉部位</div>}
                      </div>
                  </div>
              </div>
              <div className="p-4 md:p-6 border-t border-slate-800 bg-slate-900 rounded-b-xl flex justify-end gap-3">
                  <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">取消</button>
                  <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-colors">儲存變更</button>
              </div>
          </div>
      </div>
  );
};

// --- 主應用程式 ---
export default function StockTrackerApp() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isZeroCostModalOpen, setIsZeroCostModalOpen] = useState(false);
  const [isPortfolioEditorOpen, setIsPortfolioEditorOpen] = useState(false);
  
  // 1. 狀態管理 (讀取/寫入 LocalStorage)
  const [positions, setPositions] = useState(() => {
    const saved = localStorage.getItem('stock_positions_v3');
    return saved ? JSON.parse(saved) : DEMO_DATA.positions;
  });

  const [cash, setCash] = useState(() => {
    const saved = localStorage.getItem('stock_cash_v3');
    return saved ? parseFloat(saved) : DEMO_DATA.cash;
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('stock_transactions_v3');
    return saved ? JSON.parse(saved) : DEMO_DATA.transactions;
  });

  // 交易介面狀態
  const [tradeShares, setTradeShares] = useState('');
  const [tradePrice, setTradePrice] = useState('');

  // 2. 股票列表
  const [stocks, setStocks] = useState(() => {
    const savedPositions = localStorage.getItem('stock_positions_v3');
    if (!savedPositions) return INITIAL_MARKET_DATA;
    const posKeys = Object.keys(JSON.parse(savedPositions));
    return posKeys.map(symbol => ({ symbol, name: symbol, price: 0, change: 0 }));
  });
  
  // 預設為 null (顯示 Dashboard)
  const [selectedSymbol, setSelectedSymbol] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [candleData, setCandleData] = useState({});
  const candleCache = useRef({}); 
  const [dataStatus, setDataStatus] = useState({}); 
  const [stockNews, setStockNews] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);

  // API Key & Data Source (LocalStorage)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('finnhub_api_key') || '');
  const [dataSource, setDataSource] = useState(() => localStorage.getItem('data_source') || 'YAHOO'); 

  useEffect(() => {
    if (apiKey) localStorage.setItem('finnhub_api_key', apiKey);
    else localStorage.removeItem('finnhub_api_key');
  }, [apiKey]);

  useEffect(() => {
      localStorage.setItem('data_source', dataSource);
  }, [dataSource]);

  // 儲存狀態到 LocalStorage
  useEffect(() => {
    localStorage.setItem('stock_positions_v3', JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem('stock_cash_v3', cash.toString());
  }, [cash]);

  useEffect(() => {
    localStorage.setItem('stock_transactions_v3', JSON.stringify(transactions));
  }, [transactions]);

  // 切換股票時，重置交易輸入框並代入當前價格
  useEffect(() => {
    setTradeShares('');
    const current = stocks.find(s => s.symbol === selectedSymbol);
    if (current) {
        setTradePrice(current.price);
    }
  }, [selectedSymbol, stocks]);

  // 核心數據獲取函數
  const fetchMarketData = async (forceRetry = false) => {
      if (selectedSymbol) setIsLoading(true);
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 800));
      const newCandleData = {};
      const newDataStatus = { ...dataStatus };
      const symbolsToFetch = Array.from(new Set([...Object.keys(positions), selectedSymbol])).filter(Boolean);
      const updatedStocksMap = {};

      const fetchPromise = (async () => {
        for (const symbol of symbolsToFetch) {
            const existingStock = stocks.find(s => s.symbol === symbol) || { symbol, name: symbol, price: 0, change: 0 };
            let fetchedPrice = existingStock.price;
            let fetchedChange = existingStock.change;
            let candles = [];
            let status = 'MOCK';
            let error = null;
            let useSource = dataSource;
            if (useSource === 'FINNHUB' && !apiKey) useSource = 'YAHOO'; 

            if (useSource === 'FINNHUB' && apiKey) {
                const quote = await fetchStockQuoteFinnhub(symbol, apiKey);
                if (quote) { fetchedPrice = quote.price; fetchedChange = quote.change; }
                if (symbol === selectedSymbol) {
                    if (!forceRetry && candleCache.current[symbol]) {
                        candles = candleCache.current[symbol];
                        status = 'REAL';
                    } else {
                        const result = await fetchFinnhubCandles(symbol, apiKey);
                        if (result.success) {
                            candles = result.data;
                            status = 'REAL';
                            candleCache.current[symbol] = candles;
                            if (!quote) {
                                fetchedPrice = candles[candles.length-1].c;
                                const prev = candles[candles.length-2];
                                fetchedChange = prev ? ((fetchedPrice - prev.c)/prev.c)*100 : 0;
                            }
                        } else {
                            error = result.error;
                        }
                    }
                }
            } else if (useSource === 'YAHOO') {
                if (symbol === selectedSymbol) {
                    if (!forceRetry && candleCache.current[symbol]) {
                        candles = candleCache.current[symbol];
                        status = 'REAL';
                        fetchedPrice = candles[candles.length-1].c;
                    } else {
                        const result = await fetchYahooCandles(symbol);
                        if (result.success) {
                            candles = result.data;
                            status = 'REAL';
                            candleCache.current[symbol] = candles;
                            if (result.price) { fetchedPrice = result.price; fetchedChange = result.change || 0; }
                            else { fetchedPrice = candles[candles.length-1].c; const prev = candles[candles.length-2]; fetchedChange = prev ? ((fetchedPrice - prev.c)/prev.c)*100 : 0; }
                        } else { error = result.error; }
                    }
                }
            }
            if (status !== 'REAL') {
                if (candleData[symbol] && !forceRetry) {
                    candles = candleData[symbol];
                    status = dataStatus[symbol] || 'MOCK';
                } else {
                    const target = fetchedPrice || existingStock.price || 150;
                    candles = generateCandleData(target, 180);
                    status = error || 'MOCK';
                    fetchedPrice = candles[candles.length-1].c;
                    const prev = candles[candles.length-2];
                    fetchedChange = ((fetchedPrice - prev.c)/prev.c)*100;
                }
            }
            if (symbol === selectedSymbol) {
                newCandleData[symbol] = candles;
                newDataStatus[symbol] = status;
            }
            updatedStocksMap[symbol] = { ...existingStock, price: fetchedPrice, change: fetchedChange };
        }
        setStocks(Object.values(updatedStocksMap));
        setCandleData(prev => ({ ...prev, ...newCandleData }));
        setDataStatus(newDataStatus);
      })();
      await Promise.all([fetchPromise, minLoadTime]);
      setIsLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => { fetchMarketData(); }, 500); 
    return () => clearTimeout(timer);
  }, [apiKey, dataSource, positions, selectedSymbol]); 

  // 新聞獲取
  useEffect(() => {
    const fetchNews = async () => {
        if (!selectedSymbol) return;
        const news = await fetchCompanyNews(selectedSymbol, apiKey, dataSource);
        setStockNews((news && news.length > 0) ? news : (MOCK_NEWS[selectedSymbol] || MOCK_NEWS['DEFAULT']));
    };
    fetchNews();
  }, [selectedSymbol, apiKey, dataSource]);

  // 新增股票流程
  const handleAddStock = async () => {
    if (!searchQuery) return;
    const symbol = searchQuery.toUpperCase();
    if (positions[symbol]) { setSelectedSymbol(symbol); setSearchQuery(''); return; }
    setIsLoading(true);
    const newStock = { symbol, name: symbol, price: 150, change: 0 };
    setStocks(prev => { if (prev.find(s => s.symbol === symbol)) return prev; return [...prev, newStock]; });
    setSelectedSymbol(symbol);
    setSearchQuery('');
    setIsLoading(false);
  };

  const logTransaction = (type, amount, details = {}) => {
    const newBalance = type === 'buy' || type === 'withdraw' ? cash - amount : cash + amount;
    const newTx = { id: `tx_${Date.now()}`, date: new Date().toISOString(), type, amount, balance: newBalance, ...details };
    setTransactions(prev => [newTx, ...prev]);
  };

  const handleWalletTransaction = (type, amount) => {
    if (type === 'deposit') { setCash(prev => prev + amount); logTransaction('deposit', amount); }
    else { setCash(prev => prev - amount); logTransaction('withdraw', amount); }
  };

  const handleQuickTrade = (type) => {
    const symbol = selectedSymbol;
    const quantity = parseFloat(tradeShares);
    const price = parseFloat(tradePrice);
    if (!quantity || quantity <= 0 || !price || price <= 0) return;
    const totalAmount = quantity * price;

    if (type === 'buy') {
        if (cash < totalAmount) { alert('現金餘額不足！'); return; }
        setPositions(prev => {
            const currentPos = prev[symbol] || { shares: 0, cost: 0, zeroCost: { shares: 0, faceValue: 0 } };
            const newShares = currentPos.shares + quantity;
            const newCost = ((currentPos.shares * currentPos.cost) + totalAmount) / newShares;
            return { ...prev, [symbol]: { ...currentPos, shares: newShares, cost: newCost } };
        });
        setCash(prev => prev - totalAmount);
        logTransaction('buy', totalAmount, { symbol, shares: quantity, price: price });
        setTradeShares('');
    } else {
        const currentPos = positions[symbol];
        if (!currentPos || currentPos.shares < quantity) { alert('持倉不足！'); return; }
        setPositions(prev => {
            const newShares = currentPos.shares - quantity;
            if (newShares <= 0 && (!currentPos.zeroCost || currentPos.zeroCost.shares <= 0)) { const next = { ...prev }; delete next[symbol]; return next; }
            else { return { ...prev, [symbol]: { ...currentPos, shares: Math.max(0, newShares) } }; }
        });
        setCash(prev => prev + totalAmount);
        logTransaction('sell', totalAmount, { symbol, shares: quantity, price: price });
        setTradeShares('');
    }
  };

  const handleSaveZeroCost = (symbol, shares, faceValue) => {
      setPositions(prev => {
          const currentPos = prev[symbol] || { shares: 0, cost: 0, zeroCost: { shares: 0, faceValue: 0 } };
          return { ...prev, [symbol]: { ...currentPos, zeroCost: { shares, faceValue } } };
      });
  };

  const portfolioStocks = stocks.filter(s => positions[s.symbol]);
  const totalMarketValue = portfolioStocks.reduce((sum, stock) => {
      const pos = positions[stock.symbol];
      const regularVal = pos.shares * stock.price;
      const zeroCostVal = pos.zeroCost ? pos.zeroCost.shares * stock.price : 0;
      return sum + regularVal + zeroCostVal;
  }, 0);
  const totalEquity = cash + totalMarketValue;
  const currentStock = stocks.find(s => s.symbol === selectedSymbol) || { symbol: '', name: '', price: 0, change: 0 };
  const currentCandles = candleData[selectedSymbol] || [];
  const isUp = currentStock.change >= 0;
  const currentPosition = positions[selectedSymbol];

  const positionStats = useMemo(() => {
    let marketValue = 0, posCost = 0, gainLoss = 0, gainLossPercent = 0, zc = { shares: 0, faceValue: 0 };
    if (currentPosition) {
        marketValue = currentPosition.shares * currentStock.price;
        posCost = currentPosition.shares * currentPosition.cost;
        gainLoss = marketValue - posCost;
        gainLossPercent = posCost > 0 ? (gainLoss / posCost) * 100 : 0;
        if (currentPosition.zeroCost) zc = { ...currentPosition.zeroCost };
    }
    const zcMarketValue = zc.shares * currentStock.price;
    return { marketValue, posCost, gainLoss, gainLossPercent, zc, zcMarketValue };
  }, [currentPosition, currentStock.price]);

  const tradeNumShares = parseFloat(tradeShares) || 0;
  const tradeNumPrice = parseFloat(tradePrice) || 0;
  const tradeTotal = tradeNumShares * tradeNumPrice;
  const maxSellShares = currentPosition ? currentPosition.shares : 0;
  const canBuy = tradeTotal > 0 && tradeTotal <= cash;
  const canSell = tradeTotal > 0 && tradeNumShares <= maxSellShares;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} apiKey={apiKey} setApiKey={setApiKey} dataSource={dataSource} setDataSource={setDataSource} />
      <WalletModal isOpen={isWalletModalOpen} onClose={() => setIsWalletModalOpen(false)} cash={cash} onTransaction={handleWalletTransaction} />
      <HistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} transactions={transactions} />
      <ZeroCostModal isOpen={isZeroCostModalOpen} onClose={() => setIsZeroCostModalOpen(false)} symbol={selectedSymbol} zeroCostData={currentPosition?.zeroCost} onSave={handleSaveZeroCost} />
      <PortfolioEditorModal isOpen={isPortfolioEditorOpen} onClose={() => setIsPortfolioEditorOpen(false)} cash={cash} setCash={setCash} positions={positions} setPositions={setPositions} />
      
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      
      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-80 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col`}>
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <div className="flex items-center gap-2 text-indigo-400"><Layers className="w-6 h-6" /><h1 className="text-xl font-bold text-white">StockPro</h1></div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400"><X size={24} /></button>
        </div>
        <div className="p-4 bg-gradient-to-b from-indigo-900/20 to-slate-900 border-b border-slate-800 space-y-4">
            <div><div className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between"><span>總權益 (Total Equity)</span><button onClick={() => setIsPortfolioEditorOpen(true)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"><Edit size={12} /></button></div><div className="text-3xl font-mono font-bold text-white tracking-tight">{formatCurrency(totalEquity)}</div></div>
            <div className="grid grid-cols-2 gap-2">
                <div onClick={() => setIsWalletModalOpen(true)} className="bg-slate-800/50 p-2 rounded border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors group"><div className="text-[10px] text-slate-500 uppercase mb-1 flex items-center gap-1 group-hover:text-emerald-400"><DollarSign size={10} /> 現金餘額</div><div className="font-mono text-sm font-semibold text-emerald-400">{formatCurrency(cash)}</div></div>
                <div className="bg-slate-800/50 p-2 rounded border border-slate-700"><div className="text-[10px] text-slate-500 uppercase mb-1 flex items-center gap-1"><PieChart size={10} /> 股票市值</div><div className="font-mono text-sm font-semibold text-indigo-400">{formatCurrency(totalMarketValue)}</div></div>
            </div>
            <AllocationChart positions={positions} stocks={stocks} cash={cash} />
        </div>
        <div className="p-4 border-b border-slate-800/50">
          <button onClick={() => { setSelectedSymbol(null); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-4 ${selectedSymbol === null ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Home size={18} /><span className="font-medium text-sm">總覽儀表板 (Dashboard)</span></button>
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input type="text" placeholder="搜尋代號 (如 AMD)" className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-10 py-2 focus:border-indigo-500 outline-none text-white text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddStock()} /><button onClick={handleAddStock} className="absolute right-2 top-2 p-0.5 hover:bg-slate-700 rounded text-slate-400"><Plus size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1 py-2">
           <div className="px-2 pb-2 text-xs font-semibold text-slate-500 uppercase flex justify-between"><span>持倉部位 ({portfolioStocks.length})</span>{isLoading && <RefreshCw size={12} className="animate-spin text-indigo-400" />}</div>
           {portfolioStocks.length === 0 && <div className="text-center py-8 text-slate-500 text-xs">無持倉</div>}
           {portfolioStocks.map(stock => {
             const active = stock.symbol === selectedSymbol; const pos = positions[stock.symbol]; const up = stock.change >= 0; const totalVal = (pos.shares * stock.price) + (pos.zeroCost ? pos.zeroCost.shares * stock.price : 0);
             return (
               <button key={stock.symbol} onClick={() => { setSelectedSymbol(stock.symbol); setIsSidebarOpen(false); }} className={`w-full flex justify-between items-center p-3 rounded-lg transition-all ${active ? 'bg-indigo-900/40 border border-indigo-500/30' : 'hover:bg-slate-800 border border-transparent'} group`}>
                 <div className="text-left"><div className="flex items-center gap-2"><span className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors">{stock.symbol}</span>{pos.zeroCost && pos.zeroCost.shares > 0 && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" title="含零成本部位"></div>}</div><div className="text-xs text-slate-400">{pos.shares + (pos.zeroCost?.shares || 0)} 股</div></div>
                 <div className="text-right"><div className="font-mono text-sm font-medium text-white">{formatCurrency(totalVal)}</div><div className={`text-xs flex items-center justify-end ${up ? 'text-emerald-400' : 'text-rose-400'}`}>{formatPercent(stock.change)}</div></div>
               </button>
             )
           })}
        </div>
        <div className="p-4 border-t border-slate-800 grid gap-2">
          <button onClick={() => setIsHistoryModalOpen(true)} className="flex items-center justify-between px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 hover:text-white transition-colors border border-slate-700"><div className="flex items-center gap-2"><History size={14} /> 交易歷史</div><ChevronRight size={14} /></button>
          <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 px-3 py-1 text-xs text-slate-500 hover:text-white transition-colors"><Settings size={14} /><span>資料源: {dataSource === 'YAHOO' ? 'Yahoo (Proxy)' : 'Finnhub'}</span></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto relative">
        <div className="md:hidden p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur z-10"><button onClick={() => setIsSidebarOpen(true)}><Menu className="text-white" /></button><span className="font-bold">{selectedSymbol || '總覽'}</span><div className="w-6" /></div>
        {selectedSymbol ? (
          <div className="p-4 md:p-6 lg:p-10 max-w-6xl mx-auto w-full space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
              <div><div className="flex items-baseline gap-3"><h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">{currentStock.symbol}</h2><span className="text-lg md:text-xl text-slate-400">{currentStock.name}</span></div><div className="mt-2 flex gap-2 text-sm text-slate-500"><span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">Daily Candles</span><span className="flex items-center gap-1"><Calendar size={14}/> {new Date().toISOString().split('T')[0]}</span></div></div>
              <div className="text-right"><div className="text-3xl md:text-5xl font-mono text-white">{formatCurrency(currentStock.price)}</div><div className={`text-xl font-medium mt-1 flex items-center justify-end gap-2 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>{isUp ? '+' : ''}{currentStock.change.toFixed(2)}%{isUp ? <TrendingUp size={24} /> : <TrendingDown size={24} />}</div></div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
               <div className="text-xs text-indigo-400 font-bold mb-2 flex items-center gap-2"><Newspaper size={14} /> 最新快訊</div>
               <div className="space-y-2">{stockNews.map((news) => (<a key={news.id} href={news.url} target="_blank" rel="noreferrer" className="block group"><div className="flex items-start gap-2"><span className="text-slate-500 text-[10px] mt-0.5 whitespace-nowrap">{new Date(news.datetime).getHours().toString().padStart(2, '0')}:{new Date(news.datetime).getMinutes().toString().padStart(2, '0')}</span><div className="flex-1"><span className="text-xs text-slate-300 group-hover:text-white group-hover:underline decoration-slate-500 underline-offset-2 transition-colors line-clamp-1">{news.headline}</span><span className="text-[10px] text-slate-600 ml-2">- {news.source}</span></div></div></a>))}{stockNews.length === 0 && <div className="text-xs text-slate-600 text-center py-1">暫無最新消息</div>}</div>
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 rounded-xl border border-slate-800 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Briefcase size={120} /></div>
               <div className="p-4 md:p-6">
                 <div className="flex items-center gap-2 mb-6"><h3 className="text-xl font-bold text-white flex items-center gap-2"><Briefcase className="text-indigo-400" size={24} /> 我的倉位詳情</h3></div>
                 {currentPosition && currentPosition.shares > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                        <div><div className="text-slate-400 text-xs mb-1 uppercase">交易倉位市值</div><div className="text-2xl font-mono text-white font-bold">{formatCurrency(positionStats.marketValue)}</div></div>
                        <div><div className="text-slate-400 text-xs mb-1 uppercase">未實現損益</div><div className={`text-2xl font-mono font-bold flex items-center gap-1 ${positionStats.gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{positionStats.gainLoss >= 0 ? '+' : ''}{formatCurrency(positionStats.gainLoss)}</div></div>
                        <div><div className="text-slate-400 text-xs mb-1 uppercase">報酬率</div><div className={`text-2xl font-mono font-bold ${positionStats.gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatPercent(positionStats.gainLossPercent)}</div></div>
                        <div><div className="text-slate-400 text-xs mb-1 uppercase">持股 / 平均成本</div><div className="text-lg font-mono text-slate-200">{currentPosition.shares} 股 <span className="text-slate-500 text-xs mx-1">@</span> {formatCurrency(currentPosition.cost)}</div></div>
                    </div>
                 ) : (
                   <div className="mb-6 p-4 bg-slate-900/30 border border-dashed border-slate-700 rounded-lg text-center text-slate-400">尚未持有此股票的主要倉位。</div>
                 )}
                 <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 mb-8">
                    <div className="flex justify-between items-start mb-3"><h4 className="text-sm font-bold text-amber-400 flex items-center gap-2"><Gift size={16} /> 零成本 / 獲利股</h4><button onClick={() => setIsZeroCostModalOpen(true)} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-1 rounded border border-slate-700"><Edit size={12} /> 編輯</button></div>
                    {positionStats.zc.shares > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><div className="text-[10px] text-slate-500 uppercase">零成本股數</div><div className="text-lg font-mono text-white">{positionStats.zc.shares} 股</div></div>
                            <div><div className="text-[10px] text-slate-500 uppercase">市值 (純利)</div><div className="text-lg font-mono text-emerald-400">+{formatCurrency(positionStats.zcMarketValue)}</div></div>
                            <div><div className="text-[10px] text-slate-500 uppercase">面額/參考價</div><div className="text-lg font-mono text-slate-400">{formatCurrency(positionStats.zc.faceValue)}</div></div>
                            <div className="flex items-center text-xs text-slate-500">此部分不計入平均成本</div>
                        </div>
                    ) : <div className="text-xs text-slate-500 text-center py-2">尚無紀錄。點擊右上方編輯按鈕來新增。</div>}
                 </div>
                 <div className="border-t border-slate-800 my-6"></div>
                 <div>
                    <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><Calculator size={16} className="text-indigo-400"/> 快速交易 (Quick Trade)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-800/20 p-4 rounded-xl border border-slate-800/50">
                        <div className="md:col-span-3 space-y-1"><label className="text-xs text-slate-400">股數 (Shares)</label><input type="number" min="0" step="any" placeholder="0" value={tradeShares} onChange={(e) => setTradeShares(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                        <div className="md:col-span-3 space-y-1"><label className="text-xs text-slate-400">成交價 (Price)</label><input type="number" min="0" step="any" value={tradePrice} onChange={(e) => setTradePrice(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                        <div className="md:col-span-2 text-right md:text-left px-2"><div className="text-xs text-slate-500">預估金額</div><div className="text-sm font-mono font-bold text-white">{formatCurrency(tradeTotal)}</div><div className="text-[10px] text-slate-500 mt-1">現金: {formatCurrency(cash)}</div></div>
                        <div className="md:col-span-2"><button onClick={() => handleQuickTrade('buy')} disabled={!canBuy} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-1"><ArrowDownCircle size={16} /> 買入</button></div>
                        <div className="md:col-span-2"><button onClick={() => handleQuickTrade('sell')} disabled={!canSell} className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-1"><ArrowUpCircle size={16} /> 賣出</button></div>
                    </div>
                 </div>
               </div>
            </div>
            <div className="bg-slate-900/50 p-1 rounded-xl border border-slate-800/50 relative">
               <div className="p-4 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2"><BarChart3 className="text-indigo-400" size={20} /> 價格走勢 (Interactive)</h3>
                 {/* 修正資料來源標註邏輯 (需求1) */}
                 <div className="text-xs text-slate-500 text-right">
                   {dataStatus[selectedSymbol] === 'REAL' 
                     ? (dataSource === 'YAHOO' ? '資料來源: Yahoo Finance' : '資料來源: Finnhub API')
                     : '資料來源: 模擬生成 (Simulation)'}
                 </div>
               </div>
               <div className="px-4 pb-4 relative">
                 {isLoading && <div className="absolute inset-x-4 inset-y-0 bottom-4 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm rounded-xl"><div className="w-48 h-1 bg-slate-700 rounded-full overflow-hidden mb-3"><div className="h-full bg-indigo-500 animate-[progress_1.5s_ease-in-out_infinite]" style={{ width: '50%' }}></div></div><div className="flex items-center gap-2 text-indigo-300 text-sm font-medium animate-pulse"><Loader2 className="animate-spin" size={16}/> 正在同步市場數據...</div></div>}
                 <CandleChart data={currentCandles} avgCost={currentPosition?.cost} dataStatus={dataStatus[selectedSymbol]} dataSource={dataSource} onRetry={() => fetchMarketData(true)} />
               </div>
            </div>
          </div>
        ) : (
          <DashboardView positions={positions} stocks={stocks} cash={cash} totalEquity={totalEquity} totalMarketValue={totalMarketValue} onSelectStock={setSelectedSymbol} />
        )}
      </main>
    </div>
  );
}