
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem } from '../types';

interface NotificationsProps {
    onBack: () => void;
}

export const Notifications: React.FC<NotificationsProps> = ({ onBack }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [news, setNews] = useState<NewsItem[]>([]);

    const fetchLatestBreakingNews = useCallback(async () => {
        setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = "Recherche les 5 actualités les plus importantes et urgentes de la dernière heure concernant l'IA, la Tech mondiale et l'économie. Retourne une liste d'objets JSON avec catégorie, titre, résumé court, tendance (urgent, up, down ou neutral) et timestamp relatif.";

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
                                category: { type: Type.STRING },
                                title: { type: Type.STRING },
                                summary: { type: Type.STRING },
                                trend: { type: Type.STRING },
                                timestamp: { type: Type.STRING }
                            },
                            required: ["category", "title", "summary", "trend", "timestamp"]
                        }
                    }
                }
            });

            const results = JSON.parse(response.text || "[]");
            setNews(results);
        } catch (error) {
            console.error("Breaking News Error:", error);
            // Fallback mock data
            setNews([
                { category: 'AI', title: 'OpenAI annonce GPT-5 en accès limité', summary: 'Une fuite suggère des capacités de raisonnement 10x supérieures.', trend: 'urgent', timestamp: '5m ago' },
                { category: 'Economy', title: 'Taux directeurs : Statu quo de la BCE', summary: 'Christine Lagarde maintient les taux malgré l\'inflation en baisse.', trend: 'neutral', timestamp: '12m ago' },
                { category: 'Tech', title: 'Nvidia dépasse Microsoft en capitalisation', summary: 'La demande en puces IA propulse le géant au sommet mondial.', trend: 'up', timestamp: '24m ago' }
            ]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLatestBreakingNews();
    }, [fetchLatestBreakingNews]);

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'urgent': return <span className="material-symbols-outlined text-red-500 animate-pulse">new_releases</span>;
            case 'up': return <span className="material-symbols-outlined text-green-500">trending_up</span>;
            case 'down': return <span className="material-symbols-outlined text-red-400">trending_down</span>;
            default: return <span className="material-symbols-outlined text-white/30">remove</span>;
        }
    };

    return (
        <div className="flex flex-col h-full bg-background-dark overflow-hidden">
            <header className="px-6 py-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-background-dark/95 backdrop-blur-2xl z-20">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onBack}
                        className="size-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all"
                    >
                        <span className="material-symbols-outlined text-white/70">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold">Important Alerts</h1>
                        <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest">Real-time Intelligence</p>
                    </div>
                </div>
                <button 
                    onClick={fetchLatestBreakingNews}
                    disabled={isLoading}
                    className="size-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:text-primary transition-colors disabled:opacity-30"
                >
                    <span className={`material-symbols-outlined ${isLoading ? 'animate-spin' : ''}`}>sync</span>
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {isLoading && news.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                        <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Scanning Global Flux...</p>
                    </div>
                ) : (
                    news.map((item, idx) => (
                        <div 
                            key={idx}
                            className={`p-5 rounded-3xl border transition-all animate-in slide-in-from-right-4 duration-500 ${
                                item.trend === 'urgent' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/5'
                            }`}
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                        item.trend === 'urgent' ? 'bg-red-500 text-white' : 'bg-primary/20 text-primary'
                                    }`}>
                                        {item.category}
                                    </span>
                                    <span className="text-[10px] text-white/30 font-bold uppercase">{item.timestamp}</span>
                                </div>
                                {getTrendIcon(item.trend)}
                            </div>
                            <h3 className={`text-sm font-bold mb-2 leading-tight ${item.trend === 'urgent' ? 'text-red-100' : 'text-white'}`}>
                                {item.title}
                            </h3>
                            <p className="text-xs text-white/50 leading-relaxed italic">
                                "{item.summary}"
                            </p>
                            <div className="mt-4 flex justify-end">
                                <button className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1 hover:gap-2 transition-all">
                                    Explore Analysis <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}

                {!isLoading && (
                    <div className="py-10 text-center opacity-20">
                        <p className="text-[8px] font-black uppercase tracking-[0.3em]">End of Transmission</p>
                    </div>
                )}
            </div>
        </div>
    );
};
