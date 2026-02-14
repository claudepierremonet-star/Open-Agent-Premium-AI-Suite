
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MODELS, AIModel } from '../constants';

interface VideoGenProps {
    onBack: () => void;
}

type AspectRatio = "16:9" | "9:16";
type Resolution = "720p" | "1080p";

export const VideoGen: React.FC<VideoGenProps> = ({ onBack }) => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
    const [resolution, setResolution] = useState<Resolution>("720p");
    const [keyError, setKeyError] = useState(false);

    const handleKeySelection = async () => {
        try {
            await (window as any).aistudio.openSelectKey();
            setKeyError(false);
        } catch (err) {
            console.error("Key selection failed", err);
        }
    };

    const executeVideoGeneration = async () => {
        if (!prompt.trim() || isGenerating) return;
        
        // Mandatory check for selected API key for Veo models
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            setKeyError(true);
            return;
        }

        setIsGenerating(true);
        setVideoUrl(null);
        setKeyError(false);

        try {
            // Re-instantiate to get latest key from the dialog
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt,
                config: {
                    numberOfVideos: 1,
                    resolution: resolution,
                    aspectRatio: aspectRatio
                }
            });

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                if (!response.ok) throw new Error("Failed to fetch video bytes");
                const blob = await response.blob();
                setVideoUrl(URL.createObjectURL(blob));
            }
        } catch (error: any) {
            console.error("Video Generation Error:", error);
            // Handle specific permission/billing errors
            if (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("Requested entity was not found")) {
                setKeyError(true);
            } else {
                alert("Une erreur est survenue lors de la génération. Vérifiez vos quotas.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-stellar">
            <header className="px-6 py-6 border-b border-intl-border bg-white sticky top-0 z-20 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="size-10 border-2 border-intl-border rounded-xl flex items-center justify-center hover:bg-stellar transition-all active:scale-95">
                        <span className="material-symbols-outlined text-graphite/60 font-bold">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-graphite uppercase">Cinema Studio</h1>
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Veo 3.1 Pro Rendering</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-32">
                {/* Status and Key Alert */}
                {keyError && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-[1.5rem] p-6 animate-in slide-in-from-top-4 duration-500">
                        <div className="flex items-start gap-4 mb-4">
                            <span className="material-symbols-outlined text-red-500 text-3xl font-bold">account_balance_wallet</span>
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-red-700 uppercase tracking-tight">Clé API Requise</h4>
                                <p className="text-[11px] text-red-600 font-bold leading-relaxed">
                                    Le moteur Veo nécessite une clé API provenant d'un projet GCP avec facturation activée.
                                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline ml-1">En savoir plus sur la facturation.</a>
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleKeySelection}
                            className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                        >
                            Sélectionner une clé payante
                        </button>
                    </div>
                )}

                <div className="aspect-video w-full rounded-[2rem] bg-white border-2 border-intl-border relative overflow-hidden shadow-2xl transition-all">
                    {videoUrl ? (
                        <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-graphite/10 text-center px-10">
                            {isGenerating ? (
                                <div className="flex flex-col items-center gap-8">
                                    <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] animate-pulse">Synthèse Cinématique en cours...</p>
                                        <p className="text-[9px] font-bold text-graphite/40 uppercase tracking-widest italic">(Ceci peut prendre plusieurs minutes)</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="size-20 rounded-full bg-stellar border-2 border-intl-border flex items-center justify-center">
                                        <span className="material-symbols-outlined text-5xl">movie_filter</span>
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed text-graphite/30">En attente de script visuel</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-graphite/30 ml-1">Direction Artistique</h3>
                    <div className="bg-white border-2 border-intl-border rounded-3xl p-5 shadow-inner focus-within:border-primary/40 transition-all">
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 text-graphite text-[15px] font-bold p-0 min-h-[120px] resize-none placeholder:text-graphite/10"
                            placeholder={`"Un drone survolant une forêt de néons, style cinématographique 1080p..."`}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-graphite/30 ml-1">Aspect</p>
                        <div className="flex bg-white border-2 border-intl-border rounded-2xl p-1 shadow-sm">
                            {["16:9", "9:16"].map((ratio) => (
                                <button key={ratio} onClick={() => setAspectRatio(ratio as any)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${aspectRatio === ratio ? 'bg-primary text-white shadow-xl' : 'text-graphite/40 hover:text-graphite'}`}>{ratio}</button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-graphite/30 ml-1">Résolution</p>
                        <div className="flex bg-white border-2 border-intl-border rounded-2xl p-1 shadow-sm">
                            {["720p", "1080p"].map((res) => (
                                <button key={res} onClick={() => setResolution(res as any)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${resolution === res ? 'bg-graphite text-white shadow-xl' : 'text-graphite/40 hover:text-graphite'}`}>{res}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Primary Action */}
            <footer className="fixed bottom-0 inset-x-0 p-6 bg-gradient-to-t from-stellar via-stellar to-transparent z-40 max-w-md mx-auto">
                <button 
                    onClick={executeVideoGeneration}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full h-20 bg-primary text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-[0_15px_40px_rgba(255,79,0,0.3)] flex items-center justify-center gap-4 active:scale-[0.97] transition-all disabled:opacity-20 border-b-8 border-orange-700"
                >
                    <span className="material-symbols-outlined text-3xl font-bold">rocket_launch</span>
                    {isGenerating ? 'Production en cours...' : 'Lancer le Rendu'}
                </button>
            </footer>
        </div>
    );
};
