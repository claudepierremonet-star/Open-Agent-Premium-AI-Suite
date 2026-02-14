
import React, { useState, useRef } from 'react';
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

    const executeVideoGeneration = async () => {
        if (!prompt.trim() || isGenerating) return;
        setIsGenerating(true);
        setVideoUrl(null);

        try {
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
                await new Promise(resolve => setTimeout(resolve, 8000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                const blob = await response.blob();
                setVideoUrl(URL.createObjectURL(blob));
            }
        } catch (error) {
            console.error("Video Generation Error:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-stellar">
            <header className="px-6 py-6 border-b border-intl-border bg-white sticky top-0 z-20 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="size-10 border border-intl-border rounded-xl flex items-center justify-center hover:bg-stellar transition-all">
                        <span className="material-symbols-outlined text-graphite/60">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-graphite">VIDEO AI</h1>
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Cinematic Rendering</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-24">
                <div className="aspect-video w-full rounded-2xl bg-white border border-intl-border relative overflow-hidden shadow-sm">
                    {videoUrl ? (
                        <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-graphite/10 text-center px-10">
                            {isGenerating ? (
                                <div className="flex flex-col items-center gap-6">
                                    <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] animate-pulse">GENERATING CONTENT...</p>
                                </div>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-6xl">movie_filter</span>
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Awaiting vision prompt</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-graphite/20 ml-1">Prompt</h3>
                    <div className="bg-white border border-intl-border rounded-xl p-4 shadow-sm focus-within:border-primary/40 transition-all">
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 text-graphite text-sm p-0 min-h-[100px] resize-none placeholder:text-graphite/20"
                            placeholder="Describe the scene you want to generate..."
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-graphite/30 ml-1">Format</p>
                        <div className="flex bg-white border border-intl-border rounded-lg p-1">
                            {["16:9", "9:16"].map((ratio) => (
                                <button key={ratio} onClick={() => setAspectRatio(ratio as any)} className={`flex-1 py-2 rounded-md text-[10px] font-black transition-all ${aspectRatio === ratio ? 'bg-primary text-white shadow-md' : 'text-graphite/40'}`}>{ratio}</button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-graphite/30 ml-1">Quality</p>
                        <div className="flex bg-white border border-intl-border rounded-lg p-1">
                            {["720p", "1080p"].map((res) => (
                                <button key={res} onClick={() => setResolution(res as any)} className={`flex-1 py-2 rounded-md text-[10px] font-black transition-all ${resolution === res ? 'bg-graphite text-white shadow-md' : 'text-graphite/40'}`}>{res}</button>
                            ))}
                        </div>
                    </div>
                </div>

                <button 
                    onClick={executeVideoGeneration}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full h-16 bg-primary text-white rounded-xl font-black text-sm uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-3 active:scale-[0.97] transition-all disabled:opacity-20"
                >
                    <span className="material-symbols-outlined">rocket_launch</span>
                    {isGenerating ? 'Computing...' : 'Generate Video'}
                </button>
            </div>
        </div>
    );
};
