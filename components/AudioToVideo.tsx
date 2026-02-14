
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

interface AudioToVideoProps {
    onBack: () => void;
}

export const AudioToVideo: React.FC<AudioToVideoProps> = ({ onBack }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [keyError, setKeyError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleKeySelection = async () => {
        try {
            await (window as any).aistudio.openSelectKey();
            setKeyError(false);
        } catch (err) {
            console.error("Key selection failed", err);
        }
    };

    const processAudioToVideo = async () => {
        if (!file) return;

        // Mandatory check for selected API key for Veo models
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            setKeyError(true);
            return;
        }

        setIsProcessing(true);
        setKeyError(false);

        try {
            // Re-instantiate to use latest key
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Audio = (reader.result as string).split(',')[1];
                const analysisResponse = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: {
                        parts: [
                            { inlineData: { mimeType: file.type, data: base64Audio } },
                            { text: "Describe a high-energy cinematic video prompt based on this audio. Output only the prompt." }
                        ]
                    }
                });

                let operation = await ai.models.generateVideos({
                    model: 'veo-3.1-fast-generate-preview',
                    prompt: analysisResponse.text || "Motion art.",
                    config: { resolution: '720p', aspectRatio: '16:9' }
                });

                while (!operation.done) {
                    await new Promise(r => setTimeout(r, 10000));
                    operation = await ai.operations.getVideosOperation({ operation });
                }

                const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
                if (downloadLink) {
                    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                    if (!response.ok) throw new Error("Failed to fetch video bytes");
                    const blob = await response.blob();
                    setVideoUrl(URL.createObjectURL(blob));
                }
                setIsProcessing(false);
            };
        } catch (error: any) {
            console.error("AudioToVideo Error:", error);
            if (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("Requested entity was not found")) {
                setKeyError(true);
            } else {
                alert("Erreur lors de la génération. Vérifiez vos crédits API.");
            }
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-stellar">
            <header className="px-6 py-6 border-b-2 border-intl-border bg-white sticky top-0 z-20 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="size-11 border-2 border-intl-border rounded-xl flex items-center justify-center hover:bg-stellar transition-all active:scale-95">
                        <span className="material-symbols-outlined text-graphite/60 font-bold">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-graphite uppercase">Audio Flow</h1>
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Synesthesia Motion Engine</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {keyError && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 animate-in slide-in-from-top-4 duration-500">
                        <div className="flex items-start gap-4 mb-4">
                            <span className="material-symbols-outlined text-red-500 text-2xl">error_outline</span>
                            <div className="space-y-1">
                                <h4 className="text-[11px] font-black text-red-700 uppercase tracking-widest">Action Requise</h4>
                                <p className="text-[10px] text-red-600 font-bold leading-relaxed">
                                    Une clé API payante est indispensable pour utiliser le moteur Veo 3.1.
                                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline ml-1">Docs Facturation</a>
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleKeySelection}
                            className="w-full py-3.5 bg-red-500 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest active:scale-95"
                        >
                            Changer de clé API
                        </button>
                    </div>
                )}

                <div className="aspect-video w-full rounded-[2.5rem] bg-white border-4 border-intl-border relative overflow-hidden shadow-2xl transition-all">
                    {videoUrl ? (
                        <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-10 text-center">
                            {isProcessing ? (
                                <div className="flex flex-col items-center gap-8">
                                    <div className="size-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                    <p className="text-[11px] font-black text-primary uppercase tracking-[0.4em] animate-pulse">Conversion Audio en cours...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="size-20 rounded-full bg-stellar border-2 border-intl-border flex items-center justify-center shadow-inner">
                                        <span className="material-symbols-outlined text-4xl text-graphite/10">movie_creation</span>
                                    </div>
                                    <p className="text-[10px] font-black text-graphite/30 uppercase tracking-[0.2em]">Importez une source sonore</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {!isProcessing && !videoUrl && (
                    <div className="space-y-6">
                        <input type="file" accept="audio/*" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                        <button onClick={() => fileInputRef.current?.click()} className="w-full p-16 bg-white border-2 border-dashed border-intl-border rounded-[2.5rem] flex flex-col items-center gap-5 hover:border-primary/40 transition-all group shadow-sm active:scale-98">
                            <span className="material-symbols-outlined text-5xl text-graphite/20 group-hover:text-primary transition-colors">music_note</span>
                            <div className="text-center">
                                <span className="block text-[11px] font-black text-graphite/60 uppercase tracking-widest mb-1">{file ? file.name : "Importer une piste"}</span>
                                <span className="text-[9px] font-bold text-graphite/20 uppercase tracking-[0.2em]">Formats: MP3, WAV, AAC</span>
                            </div>
                        </button>
                        <button 
                            onClick={processAudioToVideo} 
                            disabled={!file} 
                            className="w-full h-20 bg-primary text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-4 disabled:opacity-20 active:scale-95 transition-all border-b-8 border-orange-700"
                        >
                            Générer la Vidéo
                        </button>
                    </div>
                )}
                
                {videoUrl && (
                    <button 
                        onClick={() => { setFile(null); setVideoUrl(null); }} 
                        className="w-full py-5 bg-white border-2 border-intl-border text-graphite/60 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-stellar transition-all active:scale-95"
                    >
                        Nouvelle Conversion
                    </button>
                )}
            </div>
        </div>
    );
};
