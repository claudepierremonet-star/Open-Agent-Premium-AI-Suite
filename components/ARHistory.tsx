
import React, { useEffect, useState, useRef } from 'react';
import { ARHistoryItem } from '../types';
import { GoogleGenAI, Modality } from "@google/genai";

export const ARHistory: React.FC = () => {
    const [history, setHistory] = useState<ARHistoryItem[]>([]);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem('openagent_ar_history');
        if (stored) {
            try {
                setHistory(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse AR history");
            }
        }
        return () => {
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    const playTranslation = async (item: ARHistoryItem) => {
        if (playingId) return;
        setPlayingId(item.id);

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
            }
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: `Prononce clairement : ${item.translated}` }] }],
                config: {
                    // Correctly use Modality.AUDIO from @google/genai
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            // Correct voice configuration
                            prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
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
                source.onended = () => setPlayingId(null);
                source.start();
            } else {
                setPlayingId(null);
            }
        } catch (error) {
            console.error("TTS Error:", error);
            setPlayingId(null);
        }
    };

    const filteredHistory = history.filter(h => {
        const matchesKeyword = h.original.toLowerCase().includes(filter.toLowerCase()) || 
                              h.translated.toLowerCase().includes(filter.toLowerCase());
        let matchesDate = true;
        if (dateFilter) {
            const itemDate = new Date(h.timestamp).toISOString().split('T')[0];
            matchesDate = itemDate === dateFilter;
        }
        return matchesKeyword && matchesDate;
    });

    return (
        <div className="flex flex-col h-full bg-stellar animate-in fade-in duration-500">
            <header className="px-6 py-6 border-b-2 border-intl-border sticky top-0 bg-white/95 backdrop-blur-xl z-20 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h1 className="text-xl font-black text-graphite tracking-tighter uppercase flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary font-black">history_edu</span>
                            Mémoire AR
                        </h1>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Journal des Détéctions</p>
                    </div>
                    <button onClick={() => { if(confirm("Vider l'historique ?")) { setHistory([]); localStorage.removeItem('openagent_ar_history'); } }} className="size-11 rounded-xl bg-white border-2 border-intl-border text-red-500 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-all shadow-sm active:scale-95">
                        <span className="material-symbols-outlined font-bold">delete_sweep</span>
                    </button>
                </div>
                <div className="flex flex-col gap-3">
                    <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-graphite/30 text-[18px]">search</span>
                        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Rechercher par texte..." className="w-full bg-stellar border-2 border-intl-border rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-graphite outline-none focus:border-primary/40 transition-all placeholder:text-graphite/20" />
                    </div>
                    <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-graphite/30 text-[18px]">calendar_today</span>
                        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full bg-stellar border-2 border-intl-border rounded-2xl py-3 pl-12 pr-4 text-[12px] font-black text-graphite outline-none focus:border-primary/40 transition-all uppercase tracking-widest" />
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-32">
                {filteredHistory.length === 0 ? (
                    <div className="py-20 text-center opacity-20">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Aucun souvenir trouvé</p>
                    </div>
                ) : (
                    filteredHistory.map((item) => (
                        <div key={item.id} className="bg-white border-2 border-intl-border rounded-[2.5rem] overflow-hidden group hover:border-primary/40 transition-all shadow-md">
                            <div className="p-6 space-y-5">
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] text-graphite/30 font-black uppercase tracking-widest">
                                        {new Date(item.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-sm text-graphite/60 font-bold leading-relaxed italic border-l-4 border-intl-border pl-4">"{item.original}"</p>
                                    <p className="text-lg font-black text-graphite leading-tight uppercase border-l-4 border-primary pl-4">"{item.translated}"</p>
                                </div>
                                <div className="pt-5 border-t-2 border-intl-border">
                                    <button onClick={() => playTranslation(item)} className={`size-12 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90 ${playingId === item.id ? 'bg-primary text-white animate-pulse' : 'bg-stellar border-2 border-intl-border text-graphite'}`}>
                                        <span className="material-symbols-outlined font-black">{playingId === item.id ? 'graphic_eq' : 'volume_up'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
