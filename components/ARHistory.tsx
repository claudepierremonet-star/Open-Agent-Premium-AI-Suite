
import React, { useEffect, useState } from 'react';
import { ARHistoryItem } from '../types';
import { GoogleGenAI, Modality } from "@google/genai";

export const ARHistory: React.FC = () => {
    const [history, setHistory] = useState<ARHistoryItem[]>([]);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('openagent_ar_history');
        if (stored) {
            try {
                setHistory(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse AR history");
            }
        }
    }, []);

    const clearHistory = () => {
        if(confirm("Vider la mémoire visuelle ?")) {
            localStorage.removeItem('openagent_ar_history');
            setHistory([]);
        }
    };

    const playTranslation = async (item: ARHistoryItem) => {
        if (playingId) return;
        setPlayingId(item.id);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: `Prononce clairement en ${item.lang}: ${item.translated}` }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
                const binaryString = atob(base64Audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                
                const dataInt16 = new Int16Array(bytes.buffer);
                const audioBuffer = audioContext.createBuffer(1, dataInt16.length, 24000);
                const channelData = audioBuffer.getChannelData(0);
                for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.onended = () => setPlayingId(null);
                source.start();
            }
        } catch (error) {
            console.error("TTS Error:", error);
            setPlayingId(null);
        }
    };

    const filteredHistory = history.filter(h => 
        h.original.toLowerCase().includes(filter.toLowerCase()) || 
        h.translated.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-background-dark">
            <header className="px-6 py-6 border-b border-white/5 sticky top-0 bg-background-dark/95 backdrop-blur-xl z-20">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">history_edu</span>
                        Mémoire AR
                    </h1>
                    <button onClick={clearHistory} className="size-9 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">delete_sweep</span>
                    </button>
                </div>
                
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-white/20 text-sm">search</span>
                    <input 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Rechercher dans vos souvenirs..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {filteredHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-10 py-20">
                        <span className="material-symbols-outlined text-7xl">camera_enhance</span>
                        <p className="font-bold uppercase tracking-widest mt-4">Aucune empreinte visuelle</p>
                    </div>
                ) : (
                    filteredHistory.map((item) => (
                        <div key={item.id} className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden group hover:border-primary/30 transition-all animate-in fade-in slide-in-from-bottom-2">
                            {/* Visual Context Thumbnail */}
                            {item.image && (
                                <div className="h-32 w-full relative overflow-hidden">
                                    <img src={item.image} className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" alt="Context" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                    <div className="absolute bottom-3 left-4 flex items-center gap-2">
                                        <div className="px-2 py-0.5 rounded bg-primary text-[8px] font-black text-white uppercase tracking-widest">{item.lang}</div>
                                        <span className="text-[9px] text-white/60 font-medium">
                                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {item.location && (
                                        <a 
                                            href={`https://www.google.com/maps?q=${item.location.lat},${item.location.lng}`}
                                            target="_blank"
                                            className="absolute top-3 right-3 size-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 text-white/40 hover:text-primary"
                                        >
                                            <span className="material-symbols-outlined text-sm">location_on</span>
                                        </a>
                                    )}
                                </div>
                            )}

                            <div className="p-5 space-y-4">
                                <div className="space-y-1">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Original</span>
                                    <p className="text-sm text-white/50 italic leading-relaxed">"{item.original}"</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-primary/40">Traduction</span>
                                    <p className="text-lg font-bold text-white leading-tight">"{item.translated}"</p>
                                </div>
                                
                                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => playTranslation(item)}
                                            className={`size-10 rounded-2xl flex items-center justify-center transition-all ${playingId === item.id ? 'bg-primary text-white animate-pulse shadow-neon' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                                        >
                                            <span className="material-symbols-outlined">{playingId === item.id ? 'graphic_eq' : 'volume_up'}</span>
                                        </button>
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(item.translated);
                                                alert("Traduction copiée !");
                                            }}
                                            className="size-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all"
                                        >
                                            <span className="material-symbols-outlined">content_copy</span>
                                        </button>
                                    </div>
                                    <button className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-primary transition-colors">
                                        Détails
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div className="py-10 text-center opacity-10">
                    <p className="text-[8px] font-black uppercase tracking-[0.4em]">Flux de Conscience Temporelle</p>
                </div>
            </div>
        </div>
    );
};
