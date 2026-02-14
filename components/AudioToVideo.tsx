
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

interface AudioToVideoProps {
    onBack: () => void;
}

export const AudioToVideo: React.FC<AudioToVideoProps> = ({ onBack }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processAudioToVideo = async () => {
        if (!file) return;
        setIsProcessing(true);
        try {
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
                    await new Promise(r => setTimeout(r, 8000));
                    operation = await ai.operations.getVideosOperation({ operation });
                }

                const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
                if (downloadLink) {
                    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                    const blob = await response.blob();
                    setVideoUrl(URL.createObjectURL(blob));
                }
                setIsProcessing(false);
            };
        } catch (error) {
            console.error(error);
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-stellar">
            <header className="px-6 py-6 border-b border-intl-border bg-white sticky top-0 z-20 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="size-10 border border-intl-border rounded-xl flex items-center justify-center hover:bg-stellar">
                        <span className="material-symbols-outlined text-graphite/60">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-graphite">AUDIO2VIDEO</h1>
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Motion Core</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <div className="aspect-video w-full rounded-2xl bg-white border border-intl-border relative overflow-hidden shadow-sm">
                    {videoUrl ? (
                        <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-10 text-center">
                            {isProcessing ? (
                                <div className="flex flex-col items-center gap-6">
                                    <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] animate-pulse">PROCESSING MOTION...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="size-16 rounded-full bg-stellar border border-intl-border flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl text-graphite/20">movie_creation</span>
                                    </div>
                                    <p className="text-[10px] font-black text-graphite/40 uppercase tracking-widest">Awaiting audio source</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {!isProcessing && !videoUrl && (
                    <div className="space-y-6">
                        <input type="file" accept="audio/*" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                        <button onClick={() => fileInputRef.current?.click()} className="w-full p-12 bg-white border-2 border-dashed border-intl-border rounded-2xl flex flex-col items-center gap-4 hover:border-primary/40 transition-all group">
                            <span className="material-symbols-outlined text-4xl text-graphite/20 group-hover:text-primary">music_note</span>
                            <span className="text-[11px] font-black text-graphite/40 uppercase tracking-widest">{file ? file.name : "Import audio source"}</span>
                        </button>
                        <button onClick={processAudioToVideo} disabled={!file} className="w-full h-16 bg-primary text-white rounded-xl font-black text-sm uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-3 disabled:opacity-20">
                            Generate Video
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
