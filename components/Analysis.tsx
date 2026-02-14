
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SourceLink {
    title: string;
    uri: string;
    domain?: string;
}

interface TrendDataPoint {
    time: string;
    value: number;
}

const generateMockTrendData = (base: number, volatility: number) => {
    const data: TrendDataPoint[] = [];
    let current = base;
    for (let i = 0; i < 7; i++) {
        current = current + (Math.random() - 0.5) * volatility;
        data.push({
            time: `Day ${i + 1}`,
            value: parseFloat(current.toFixed(2))
        });
    }
    return data;
};

export const Analysis: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [analysisText, setAnalysisText] = useState('');
    const [sources, setSources] = useState<SourceLink[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [timeLeft, setTimeLeft] = useState(300);

    // Dynamic mock data that changes slightly on each refresh
    const economyData = useMemo(() => generateMockTrendData(100, 10), [lastUpdated]);
    const cryptoData = useMemo(() => generateMockTrendData(50000, 5000), [lastUpdated]);
    const stocksData = useMemo(() => generateMockTrendData(15000, 800), [lastUpdated]);

    const fetchAnalysis = useCallback(async () => {
        setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Agis comme un analyste financier de haut niveau. Effectue une recherche approfondie sur le web pour me donner les dernières actualités cruciales (dernières 24h) concernant :
            1. Économie mondiale (Inflation, décisions banques centrales, PIB majeurs).
            2. Cryptomonnaies (Mouvements de prix Bitcoin/Ethereum, régulations, projets émergents).
            3. Marchés boursiers (Indices mondiaux, performances tech, actualités entreprises clés).
            Utilise un ton factuel, cite des chiffres précis et structure ta réponse avec des titres clairs.`;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });

            setAnalysisText(response.text || "Données introuvables.");
            
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            const extractedSources: SourceLink[] = [];
            if (chunks) {
                chunks.forEach((chunk: any) => {
                    if (chunk.web) {
                        try {
                            const url = new URL(chunk.web.uri);
                            extractedSources.push({
                                title: chunk.web.title || url.hostname,
                                uri: chunk.web.uri,
                                domain: url.hostname.replace('www.', '')
                            });
                        } catch(e) {
                            extractedSources.push({
                                title: chunk.web.title || "Source",
                                uri: chunk.web.uri
                            });
                        }
                    }
                });
            }
            const uniqueSources = Array.from(new Map(extractedSources.map(s => [s.uri, s])).values());
            
            setSources(uniqueSources);
            setLastUpdated(new Date());
            setTimeLeft(300);
        } catch (error) {
            console.error("Deep Search Error:", error);
            setAnalysisText("Une erreur est survenue lors de la recherche en temps réel.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalysis();
        const interval = setInterval(fetchAnalysis, 300000);
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => {
            clearInterval(interval);
            clearInterval(timer);
        };
    }, [fetchAnalysis]);

    const renderMiniChart = (data: TrendDataPoint[], color: string) => (
        <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={`colorValue-${color}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke={color} 
                        fillOpacity={1} 
                        fill={`url(#colorValue-${color})`} 
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-background-dark overflow-hidden">
            <header className="px-6 py-6 border-b border-white/5 sticky top-0 bg-background-dark/95 backdrop-blur-2xl z-20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                        <span className="material-symbols-outlined text-primary animate-pulse">analytics</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold">Market Intelligence</h1>
                        <div className="flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></span>
                            <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Real-Time Data Streams</p>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <button 
                        onClick={() => fetchAnalysis()}
                        disabled={isLoading}
                        className="text-[10px] font-bold text-primary hover:text-white transition-colors flex items-center gap-1 uppercase tracking-tighter"
                    >
                        {isLoading ? 'Scanning...' : 'Update'}
                        <span className={`material-symbols-outlined text-[14px] ${isLoading ? 'animate-spin' : ''}`}>sync</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {isLoading && !analysisText ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 space-y-6">
                        <div className="relative size-16">
                            <div className="absolute inset-0 border-4 border-primary/10 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-4 bg-primary/20 rounded-full animate-pulse flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary">monitoring</span>
                            </div>
                        </div>
                        <p className="text-xs font-bold text-white/50 uppercase tracking-[0.3em] animate-pulse">Aggregating Market Flows</p>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
                        {/* Market Pulse Charts */}
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { label: 'Global Economy', data: economyData, color: '#2957ff', icon: 'public' },
                                { label: 'Crypto Market', data: cryptoData, color: '#f59e0b', icon: 'currency_bitcoin' },
                                { label: 'Stock Exchange', data: stocksData, color: '#10b981', icon: 'trending_up' }
                            ].map((item, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 group hover:border-white/20 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm" style={{color: item.color}}>{item.icon}</span>
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{item.label}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">trending_up</span>
                                            Active
                                        </span>
                                    </div>
                                    {renderMiniChart(item.data, item.color)}
                                </div>
                            ))}
                        </div>

                        {/* Analysis Content */}
                        <div className="bg-surface-dark/40 border border-white/5 rounded-3xl p-6 shadow-inner relative group">
                            <div className="prose prose-invert prose-sm max-w-none text-white/80 leading-relaxed font-display whitespace-pre-wrap">
                                {analysisText}
                            </div>
                        </div>

                        {/* Sources */}
                        {sources.length > 0 && (
                            <section className="space-y-4 pt-4">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="material-symbols-outlined text-primary text-sm">verified</span>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Verified Sources</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {sources.slice(0, 4).map((source, idx) => (
                                        <a 
                                            key={idx}
                                            href={source.uri} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex flex-col gap-1 transition-all group active:scale-95"
                                        >
                                            <p className="text-[10px] font-bold text-white/80 truncate group-hover:text-primary">{source.title}</p>
                                            <div className="flex items-center gap-1.5 opacity-40">
                                                <img 
                                                    src={`https://www.google.com/s2/favicons?domain=${source.uri}&sz=32`} 
                                                    className="size-2.5 rounded-sm" 
                                                    alt="" 
                                                />
                                                <span className="text-[8px] font-medium uppercase truncate">{source.domain || 'Source'}</span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </section>
                        )}

                        <div className="py-10 flex flex-col items-center gap-2 opacity-20">
                            <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-white to-transparent"></div>
                            <span className="text-[8px] uppercase font-black tracking-widest text-center">
                                Market Pulse AI • Last Sync {lastUpdated?.toLocaleTimeString()}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="px-6 py-4 bg-background-dark/80 border-t border-white/5 backdrop-blur-md">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">Auto-refresh Cycle</span>
                    <span className="text-[9px] font-mono text-primary">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2, '0')}</span>
                </div>
                <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-primary transition-all duration-1000 ease-linear shadow-neon"
                        style={{ width: `${(timeLeft / 300) * 100}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};
