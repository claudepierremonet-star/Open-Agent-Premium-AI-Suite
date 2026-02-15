
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

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
        data.push({ time: `Day ${i + 1}`, value: parseFloat(current.toFixed(2)) });
    }
    return data;
};

const LANGUAGES = [
    { code: 'French', label: 'FR', icon: '🇫🇷' },
    { code: 'English', label: 'EN', icon: '🇺🇸' },
    { code: 'Spanish', label: 'ES', icon: '🇪🇸' },
    { code: 'Chinese', label: 'CN', icon: '🇨🇳' }
];

const ANALYSIS_MODELS = [
    { id: 'gemini', label: 'Gemini 3', icon: 'auto_awesome', color: 'text-primary' },
    { id: 'chatgpt', label: 'ChatGPT', icon: 'bolt', color: 'text-emerald-500' },
    { id: 'grok', label: 'Grok', icon: 'alternate_email', color: 'text-graphite' },
    { id: 'deepseek', label: 'DeepSeek', icon: 'biotech', color: 'text-blue-400' },
    { id: 'perplexity', label: 'Perplexity', icon: 'search', color: 'text-cyan-500' },
    { id: 'manus', label: 'Manus', icon: 'psychology', color: 'text-purple-400' },
    { id: 'dola', label: 'Dola', icon: 'calendar_today', color: 'text-amber-400' }
];

export const Analysis: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [analysisText, setAnalysisText] = useState('');
    const [sources, setSources] = useState<SourceLink[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [timeLeft, setTimeLeft] = useState(300);
    const [targetLang, setTargetLang] = useState('French');
    const [selectedModel, setSelectedModel] = useState('gemini');
    const [playingTts, setPlayingTts] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const isRequesting = useRef(false);
    const lastFetchTime = useRef<number>(0);
    const cache = useRef<Record<string, { text: string, sources: SourceLink[], time: number }>>({});

    const economyData = useMemo(() => generateMockTrendData(100, 10), [lastUpdated]);
    const cryptoData = useMemo(() => generateMockTrendData(50000, 5000), [lastUpdated]);
    const stocksData = useMemo(() => generateMockTrendData(15000, 800), [lastUpdated]);

    const fetchAnalysis = useCallback(async (lang: string, modelId: string, force: boolean = false) => {
        if (isRequesting.current) return;

        const cacheKey = `${lang}-${modelId}`;
        const now = Date.now();

        // Check cache first for performance (5 min TTL)
        if (!force && cache.current[cacheKey] && (now - cache.current[cacheKey].time < 300000)) {
            setAnalysisText(cache.current[cacheKey].text);
            setSources(cache.current[cacheKey].sources);
            setError(null);
            setIsLoading(false);
            return;
        }

        // Throttle requests to avoid 429 errors (10s gap)
        if (!force && (now - lastFetchTime.current < 10000)) {
            setError("Synchronisation trop rapide. Veuillez patienter.");
            return;
        }

        setIsLoading(true);
        setError(null);
        isRequesting.current = true;
        lastFetchTime.current = now;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let personaPrompt = "Act as a strategic analyst.";
            if (modelId === 'chatgpt') personaPrompt = "Act as ChatGPT-4o: balanced, detailed, and highly structured.";
            if (modelId === 'grok') personaPrompt = "Act as Grok-2: sharp, real-time focus, and no-nonsense.";
            if (modelId === 'deepseek') personaPrompt = "Act as DeepSeek: technical, data-driven, and highly logical.";
            if (modelId === 'perplexity') personaPrompt = "Act as Perplexity: fact-based, citation-focused, and current.";
            if (modelId === 'manus') personaPrompt = "Act as Manus: agentic, results-oriented, and strategic.";
            if (modelId === 'dola') personaPrompt = "Act as Dola AI: timeline-aware, practical, and execution-focused.";

            const prompt = `${personaPrompt}
            Research: Global Market Trends (Economy, Crypto, Stocks).
            Target Language: ${lang}.
            Output: 3 key analysis points with bold figures and professional emojis.
            Format: Markdown.`;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
                config: { 
                    tools: [{ googleSearch: {} }],
                    temperature: 0.7 
                },
            });

            const text = response.text || "Données indisponibles.";
            setAnalysisText(text);
            
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
                            extractedSources.push({ title: chunk.web.title || "Source", uri: chunk.web.uri });
                        }
                    }
                });
            }
            
            const finalSources = Array.from(new Map(extractedSources.map(s => [s.uri, s])).values());
            setSources(finalSources);
            
            // Update cache
            cache.current[cacheKey] = { text, sources: finalSources, time: Date.now() };
            setLastUpdated(new Date());
            setTimeLeft(300);
        } catch (err: any) {
            console.error("Intelligence Fetch Error:", err);
            if (err.message?.includes("429") || err.message?.includes("quota")) {
                setError("Quota API dépassé (429). Réessayez dans 60 secondes.");
            } else {
                setError("Erreur de connexion neurale. Vérifiez votre réseau.");
            }
        } finally {
            setIsLoading(false);
            isRequesting.current = false;
        }
    }, []);

    const playTts = async (text: string) => {
        if (playingTts || !text) return;
        setPlayingTts(true);
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
            }
            if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: `Read this intelligence report in ${targetLang} with a professional voice: ${text}` }] }],
                config: {
                    // Correctly use Modality.AUDIO from @google/genai
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const ctx = audioContextRef.current;
                const binaryString = atob(base64Audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                const dataInt16 = new Int16Array(bytes.buffer);
                const audioBuffer = ctx.createBuffer(1, dataInt16.length, 24000);
                const channelData = audioBuffer.getChannelData(0);
                for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.onended = () => setPlayingTts(false);
                source.start();
            } else setPlayingTts(false);
        } catch (error) {
            console.error("TTS Error:", error);
            setPlayingTts(false);
        }
    };

    useEffect(() => {
        fetchAnalysis(targetLang, selectedModel);
        const timer = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
        return () => { 
            clearInterval(timer);
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, [targetLang, selectedModel, fetchAnalysis]);

    const renderMiniChart = (data: TrendDataPoint[], color: string) => (
        <div className="h-24 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <Area type="monotone" dataKey="value" stroke={color} fillOpacity={0.05} fill={color} strokeWidth={3}/>
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-stellar overflow-hidden animate-in fade-in duration-700">
            <header className="px-6 py-6 border-b-2 border-intl-border sticky top-0 bg-white/95 backdrop-blur-md z-30 flex flex-col gap-4 shadow-sm">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-sm">
                            <span className="material-symbols-outlined text-primary text-2xl font-black">analytics</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-graphite tracking-tighter uppercase leading-tight">Intelligence</h1>
                            <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">Neural Core v4.1</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => fetchAnalysis(targetLang, selectedModel, true)} 
                        disabled={isLoading} 
                        className={`size-11 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-30`}
                    >
                        <span className={`material-symbols-outlined font-black ${isLoading ? 'animate-spin' : ''}`}>sync</span>
                    </button>
                </div>

                {/* Model Selector Bar */}
                <div className="flex gap-2 overflow-x-auto custom-scrollbar no-scrollbar pb-1 px-1">
                    {ANALYSIS_MODELS.map(model => (
                        <button 
                            key={model.id}
                            onClick={() => setSelectedModel(model.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 transition-all whitespace-nowrap shadow-sm ${
                                selectedModel === model.id 
                                    ? 'bg-graphite border-graphite text-white scale-105 z-10' 
                                    : 'bg-white border-intl-border text-graphite/40 hover:text-graphite'
                            }`}
                        >
                            <span className={`material-symbols-outlined text-[18px] ${selectedModel === model.id ? 'text-white' : model.color}`}>{model.icon}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">{model.label}</span>
                        </button>
                    ))}
                </div>

                {/* Language Switcher */}
                <div className="flex bg-stellar border-2 border-intl-border rounded-2xl p-1 shadow-sm">
                    {LANGUAGES.map(lang => (
                        <button 
                            key={lang.code} 
                            onClick={() => setTargetLang(lang.code)}
                            className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${targetLang === lang.code ? 'bg-white text-graphite shadow-md border border-intl-border' : 'text-graphite/40 hover:text-graphite'}`}
                        >
                            <span className="text-sm">{lang.icon}</span>
                            {lang.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar pb-40">
                {isLoading && !analysisText ? (
                    <div className="py-20 flex flex-col items-center gap-6 text-center">
                        <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-[12px] font-black text-graphite uppercase tracking-[0.4em] animate-pulse">Scan Global {selectedModel.toUpperCase()}...</p>
                    </div>
                ) : error ? (
                    <div className="py-12 px-8 bg-white border-4 border-red-50 rounded-[3rem] text-center space-y-6 animate-in zoom-in-95 shadow-xl">
                        <span className="material-symbols-outlined text-red-500 text-5xl">report_problem</span>
                        <div className="space-y-2">
                            <h3 className="text-sm font-black text-graphite uppercase tracking-widest">Alerte Neural</h3>
                            <p className="text-[11px] font-bold text-graphite/60 leading-relaxed">{error}</p>
                        </div>
                        <button onClick={() => fetchAnalysis(targetLang, selectedModel, true)} className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95">Relancer l'Analyse</button>
                    </div>
                ) : (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                        <div className="grid grid-cols-1 gap-5">
                            {[
                                { label: 'Global Economy', data: economyData, color: '#FF4F00', icon: 'public' },
                                { label: 'Crypto Assets', data: cryptoData, color: '#F59E0B', icon: 'currency_bitcoin' },
                                { label: 'Global Markets', data: stocksData, color: '#10B981', icon: 'trending_up' }
                            ].map((item, i) => (
                                <div key={i} className="bg-white border-2 border-intl-border rounded-[2rem] p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="material-symbols-outlined text-xl" style={{color: item.color}}>{item.icon}</span>
                                        <span className="text-[12px] font-black text-graphite uppercase tracking-widest">{item.label}</span>
                                    </div>
                                    {renderMiniChart(item.data, item.color)}
                                </div>
                            ))}
                        </div>

                        {/* Interactive Analysis Block */}
                        <section className="space-y-4">
                            <div className="flex justify-between items-end ml-1">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-graphite/40">Rapport Stratégique ({ANALYSIS_MODELS.find(m => m.id === selectedModel)?.label})</h3>
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest">{targetLang} Mode</span>
                            </div>
                            <div 
                                onClick={() => playTts(analysisText)}
                                className={`bg-white border-2 border-intl-border rounded-[2.5rem] p-10 shadow-sm relative group hover:shadow-xl transition-all cursor-pointer active:scale-[0.98] ${playingTts ? 'ring-4 ring-primary/20 border-primary' : ''}`}
                            >
                                <div className="absolute top-8 right-8">
                                     <div className={`size-12 rounded-2xl flex items-center justify-center transition-all ${playingTts ? 'bg-primary text-white animate-pulse' : 'bg-stellar text-graphite/30 group-hover:bg-primary/5 group-hover:text-primary'}`}>
                                        <span className="material-symbols-outlined font-black">{playingTts ? 'graphic_eq' : 'volume_up'}</span>
                                     </div>
                                </div>
                                <div className="text-graphite leading-[1.8] font-medium text-[17px] tracking-tight whitespace-pre-wrap">
                                    {analysisText}
                                </div>
                                <div className="mt-8 pt-8 border-t-2 border-intl-border flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-outlined text-sm font-bold">touch_app</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Tapoter pour écouter la synthèse</span>
                                </div>
                            </div>
                        </section>

                        {/* Grounding Sources */}
                        {sources.length > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                                {sources.slice(0, 4).map((source, idx) => (
                                    <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="bg-white border-2 border-intl-border rounded-2xl p-4 flex flex-col gap-2 hover:border-primary/60 transition-all shadow-sm">
                                        <p className="text-[11px] font-black text-graphite uppercase tracking-tight truncate">{source.title}</p>
                                        <div className="flex items-center gap-2">
                                            <img src={`https://www.google.com/s2/favicons?domain=${source.uri}&sz=64`} className="size-3.5 rounded" alt="" />
                                            <span className="text-[9px] font-black text-graphite/40 uppercase truncate">{source.domain}</span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <footer className="p-6 bg-white border-t-2 border-intl-border shadow-[0_-15px_40px_rgba(0,0,0,0.05)] sticky bottom-0">
                <div className="flex justify-between items-center mb-3 text-[10px] font-black uppercase tracking-widest text-graphite/40 px-2">
                    <span>Flux de Données Neural</span>
                    <span className="text-primary">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2, '0')}</span>
                </div>
                <div className="h-2 w-full bg-stellar rounded-full overflow-hidden border border-intl-border">
                    <div className="h-full bg-primary transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 300) * 100}%` }}></div>
                </div>
            </footer>
        </div>
    );
};
