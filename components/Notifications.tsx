
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem } from '../types';

interface NotificationsProps {
    onBack: () => void;
}

interface DetailedAnalysis {
    impact: string;
    recommendation: string;
    riskScore: number;
}

export const Notifications: React.FC<NotificationsProps> = ({ onBack }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [riskIndex, setRiskIndex] = useState(42);
    const [selectedAnalysis, setSelectedAnalysis] = useState<{id: number, data: DetailedAnalysis} | null>(null);
    const [errorCode, setErrorCode] = useState<number | null>(null);
    const [retryCountdown, setRetryCountdown] = useState(0);

    const fetchLatestBreakingNews = useCallback(async (force: boolean = false) => {
        if (retryCountdown > 0 && !force) return;
        
        setIsLoading(true);
        setSelectedAnalysis(null);
        setErrorCode(null);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Agis comme un terminal de renseignement futuriste ultra-rapide. 
            Recherche les 5 actualités les plus critiques (IA, Tech, Économie, Géopolitique) de la dernière heure.
            Pour chaque news, ajoute des émojis stylisés dans le titre.
            Le ton doit être direct, presque brutal.
            Retourne un JSON strict. Catégories autorisées: Economy, Crypto, Stocks, AI, Global, Tech.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                category: { type: Type.STRING, description: "One of: Economy, Crypto, Stocks, AI, Global, Tech" },
                                title: { type: Type.STRING },
                                summary: { type: Type.STRING },
                                trend: { type: Type.STRING, description: "up, down, neutral, or urgent" },
                                timestamp: { type: Type.STRING }
                            },
                            required: ["category", "title", "summary", "trend", "timestamp"]
                        }
                    }
                }
            });

            const results = JSON.parse(response.text || "[]");
            setNews(results);
            
            // Intelligence synthétique du risque
            const urgentCount = results.filter((n: any) => n.trend === 'urgent').length;
            const newRisk = 30 + (urgentCount * 18) + Math.floor(Math.random() * 12);
            setRiskIndex(Math.min(newRisk, 100));

        } catch (error: any) {
            console.error("Breaking News Error:", error);
            if (error.message?.includes("429")) {
                setErrorCode(429);
                setRetryCountdown(30); // Pause de 30 secondes pour le quota
            }
            // Fallback artistique en cas d'erreur
            setNews([
                { category: 'AI', title: '🚨 NEURAL BREACH: GPT-5 "O1" Leak', summary: 'Capacités de raisonnement autonome détectées dans des serveurs non sécurisés. 🌐', trend: 'urgent', timestamp: '2m ago' },
                { category: 'Stocks', title: '📉 FLASH CRASH: Tech Index -3.2%', summary: 'Les algorithmes de trading haute fréquence déclenchent une vente massive. 💸', trend: 'down', timestamp: '14m ago' },
                { category: 'Tech', title: '🔋 ENERGY: Solid-State Breakthrough', summary: 'Une start-up annonce une densité énergétique x4. Le monde change. ⚡', trend: 'up', timestamp: '31m ago' }
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [retryCountdown]);

    useEffect(() => {
        let timer: any;
        if (retryCountdown > 0) {
            timer = setInterval(() => setRetryCountdown(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [retryCountdown]);

    const runDeepAnalysis = async (index: number, newsItem: NewsItem) => {
        if (isAnalyzing) return;
        setIsAnalyzing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Analyse stratégique : "${newsItem.title}". 
            Donne moi : l'impact (1 phrase), une recommandation (1 phrase), et un score de risque /100.
            Réponds en JSON strict.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            impact: { type: Type.STRING },
                            recommendation: { type: Type.STRING },
                            riskScore: { type: Type.NUMBER }
                        }
                    }
                }
            });

            const data = JSON.parse(response.text || "{}");
            setSelectedAnalysis({ id: index, data });
        } catch (error) {
            console.error(error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
        fetchLatestBreakingNews();
    }, []);

    return (
        <div className="flex flex-col h-full bg-[#08080a] text-white overflow-hidden relative font-display">
            {/* Neural Background Effect */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#FF4F00 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none"></div>

            <header className="px-6 pt-8 pb-6 relative z-20 border-b border-white/5 bg-[#08080a]/60 backdrop-blur-2xl">
                <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary transition-all group active:scale-90">
                            <span className="material-symbols-outlined text-white group-hover:scale-110">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none italic">Alert Hub<span className="text-primary">.</span></h1>
                            <p className="text-[9px] text-primary font-black uppercase tracking-[0.5em] mt-1.5 animate-pulse">Neural Interception Active</p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => fetchLatestBreakingNews(true)}
                        disabled={isLoading || retryCountdown > 0}
                        className={`size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all ${isLoading ? 'animate-spin border-primary text-primary' : 'active:rotate-180'} disabled:opacity-20`}
                    >
                        <span className="material-symbols-outlined font-black">sync</span>
                    </button>
                </div>

                {/* Risk Gauge: Artistic Implementation */}
                <div className="relative p-7 rounded-[2.5rem] bg-white/[0.03] border border-white/10 overflow-hidden group shadow-2xl">
                    <div className={`absolute -right-6 -top-6 size-32 blur-3xl rounded-full transition-all duration-1000 ${riskIndex > 65 ? 'bg-red-500/20' : 'bg-primary/20'} group-hover:scale-150`}></div>
                    <div className="flex justify-between items-center relative z-10">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">System Risk Index</span>
                                {riskIndex > 65 && <span className="size-2 bg-red-500 rounded-full animate-ping"></span>}
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-6xl font-black tracking-tighter italic ${riskIndex > 65 ? 'text-red-500' : 'text-white'}`}>{riskIndex}</span>
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Global Scale</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border ${riskIndex > 65 ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-primary/10 border-primary/30 text-primary'}`}>
                                {riskIndex > 65 ? 'High Alert' : 'Operational'}
                            </div>
                            <p className="text-[9px] text-white/20 font-bold uppercase tracking-tighter">Latency: 24ms</p>
                        </div>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full mt-6 overflow-hidden">
                        <div className={`h-full transition-all duration-[1.5s] ease-out ${riskIndex > 65 ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${riskIndex}%`, boxShadow: `0 0 15px ${riskIndex > 65 ? '#ef4444' : '#FF4F00'}` }}></div>
                    </div>
                </div>

                {/* Quota Exhausted Warning (429) */}
                {errorCode === 429 && (
                    <div className="mt-4 px-5 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-amber-500 text-sm animate-pulse">warning</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">API Overload: Mode Survie Actif</span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-500/60">Retry in {retryCountdown}s</span>
                    </div>
                )}
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10 pb-32">
                {isLoading && news.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 gap-10">
                        <div className="relative">
                            <div className="size-24 border-[3px] border-primary/10 border-t-primary rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-4xl animate-pulse">radar</span>
                            </div>
                        </div>
                        <div className="space-y-3 text-center">
                            <h3 className="text-[14px] font-black uppercase tracking-[0.6em] text-primary">Interception</h3>
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">Analyse des flux mondiaux...</p>
                        </div>
                    </div>
                ) : (
                    news.map((item, idx) => (
                        <div 
                            key={idx}
                            className={`group p-8 rounded-[3rem] border-2 transition-all duration-500 relative overflow-hidden active:scale-[0.98] ${
                                item.trend === 'urgent' 
                                    ? 'bg-red-500/[0.03] border-red-500/20 shadow-[0_20px_60px_rgba(239,68,68,0.08)]' 
                                    : 'bg-white/[0.02] border-white/5 hover:border-primary/20'
                            }`}
                        >
                            {/* Decorative Glitch lines */}
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-sm font-black text-primary">analytics</span>
                            </div>

                            <div className="flex flex-col gap-5 relative z-10">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                            item.trend === 'urgent' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-primary/10 border-primary/30 text-primary'
                                        }`}>
                                            {item.category}
                                        </div>
                                        <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">{item.timestamp}</span>
                                    </div>
                                    <div className={`size-2 rounded-full ${item.trend === 'up' ? 'bg-green-500' : item.trend === 'down' ? 'bg-red-500' : 'bg-white/20'}`}></div>
                                </div>

                                <h3 className={`text-2xl font-black tracking-tight leading-none uppercase italic group-hover:text-primary transition-colors ${item.trend === 'urgent' ? 'text-red-500' : 'text-white'}`}>
                                    {item.title}
                                </h3>
                                
                                <p className="text-sm text-white/40 leading-relaxed font-medium">
                                    {item.summary}
                                </p>

                                {/* Deep Analysis Result: Ultra Functional */}
                                {selectedAnalysis?.id === idx && (
                                    <div className="mt-4 p-6 bg-white/[0.03] rounded-3xl border border-white/10 animate-in slide-in-from-left-4 duration-500 space-y-5">
                                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Strategic Insight</span>
                                            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-primary text-white shadow-lg">RISK: {selectedAnalysis.data.riskScore}</span>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Immediate Impact</p>
                                                <p className="text-[13px] font-bold text-white/80 italic">"{selectedAnalysis.data.impact}"</p>
                                            </div>
                                            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1.5">Neural Recommendation :</p>
                                                <p className="text-[12px] font-black text-white">{selectedAnalysis.data.recommendation}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 flex justify-between items-center">
                                    <div className="flex gap-2.5">
                                        <button className="size-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90"><span className="material-symbols-outlined text-lg">bookmark</span></button>
                                        <button className="size-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90"><span className="material-symbols-outlined text-lg">share</span></button>
                                    </div>
                                    <button 
                                        onClick={() => runDeepAnalysis(idx, item)}
                                        disabled={isAnalyzing}
                                        className="h-12 px-6 rounded-2xl bg-white text-[#0a0a0c] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] active:scale-95 disabled:opacity-20"
                                    >
                                        {isAnalyzing && selectedAnalysis?.id === idx ? (
                                            <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <span className="material-symbols-outlined text-lg">psychology</span>
                                        )}
                                        {selectedAnalysis?.id === idx ? 'Decoding...' : 'Deep Analysis'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                <div className="py-20 text-center relative">
                    <div className="h-px w-20 bg-white/5 mx-auto mb-6"></div>
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white/10">Sentinel Feed Terminated</p>
                </div>
            </div>

            {/* Artistic Cyber Footer */}
            <footer className="absolute bottom-0 inset-x-0 p-8 bg-[#08080a]/90 backdrop-blur-xl border-t border-white/5 z-30">
                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.4em] text-white/20">
                    <div className="flex items-center gap-3">
                        <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_#FF4F00] animate-pulse"></span>
                        Neural Pulse Active
                    </div>
                    <div className="flex gap-6">
                        <span>REGION: EU-WEST</span>
                        <span>V4.1-PRIME</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};
