
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MODELS, AIModel } from '../constants';

interface AudioToVideoProps {
    onBack: () => void;
}

export const AudioToVideo: React.FC<AudioToVideoProps> = ({ onBack }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'generating' | 'completed'>('idle');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [visualPrompt, setVisualPrompt] = useState<string | null>(null);
    const [selectedEngine, setSelectedEngine] = useState<AIModel>(MODELS.find(m => m.id === 'chatgpt') || MODELS[1]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const chatEngines = MODELS.filter(m => m.type === 'chat');

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = (error) => reject(error);
        });
    };

    const processAudioToVideo = async () => {
        if (!file) return;
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) await (window as any).aistudio.openSelectKey();

        setIsProcessing(true);
        setStatus('analyzing');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const base64Audio = await fileToBase64(file);

            // Step 1: Analyze audio using selected LLM (Simulated instruction)
            const analysisResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: file.type, data: base64Audio } },
                        { text: `Acting as ${selectedEngine.name}, analyze this audio and describe a cinematic motion video scene. Use the unique personality of ${selectedEngine.name} to craft the prompt. Output only the video prompt for Veo 3.1.` }
                    ]
                }
            });

            const promptForVideo = analysisResponse.text || "Cinematic motion journey.";
            setVisualPrompt(promptForVideo);
            setStatus('generating');

            // Step 2: Generate Video
            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: promptForVideo,
                config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
            });

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                const blob = await response.blob();
                setVideoUrl(URL.createObjectURL(blob));
                setStatus('completed');
            }
        } catch (error: any) {
            console.error("Audio-to-Video Error:", error);
            setStatus('idle');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background-dark overflow-hidden">
            <header className="px-6 py-6 border-b border-white/5 sticky top-0 bg-background-dark/95 backdrop-blur-2xl z-20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="size-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10">
                        <span className="material-symbols-outlined text-white/70">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold">Ciné-Synesthésie</h1>
                        <p className={`text-[9px] ${selectedEngine.color} font-bold uppercase tracking-widest`}>Analyzer: {selectedEngine.name}</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-24">
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-1">Select Analysis Mind</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {chatEngines.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setSelectedEngine(m)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                                    selectedEngine.id === m.id ? 'bg-white/10 border-white/30 text-white shadow-neon' : 'bg-white/5 border-white/5 text-white/30'
                                }`}
                            >
                                <span className={`material-symbols-outlined text-[18px] ${m.color}`}>{m.icon}</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest">{m.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="aspect-video w-full rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden shadow-inner">
                    {videoUrl ? (
                        <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 text-center">
                            {isProcessing ? (
                                <div className="flex flex-col items-center gap-8">
                                    <div className="relative size-20">
                                        <div className={`absolute inset-0 border-4 ${selectedEngine.color} opacity-10 rounded-full animate-pulse`}></div>
                                        <div className={`absolute inset-0 border-4 ${selectedEngine.color} border-t-transparent rounded-full animate-spin`}></div>
                                    </div>
                                    <p className={`text-xs font-bold uppercase tracking-[0.3em] ${selectedEngine.color} animate-pulse`}>{status === 'analyzing' ? `${selectedEngine.name} is listening...` : 'Synthesizing Video...'}</p>
                                </div>
                            ) : (
                                <span className="material-symbols-outlined text-6xl text-white/10">music_video</span>
                            )}
                        </div>
                    )}
                </div>

                {!isProcessing && status !== 'completed' && (
                    <div className="space-y-6">
                        <input type="file" accept="audio/*" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                        <button onClick={() => fileInputRef.current?.click()} className={`w-full p-10 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center gap-4 ${file ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-white/5'}`}>
                            <span className={`material-symbols-outlined text-5xl ${file ? 'text-primary' : 'text-white/10'}`}>{file ? 'music_note' : 'upload_file'}</span>
                            <p className="text-sm font-bold">{file ? file.name : 'Choose Audio Source'}</p>
                        </button>
                        <button onClick={processAudioToVideo} disabled={!file} className={`w-full h-16 bg-primary text-white rounded-2xl font-bold text-lg shadow-neon active:scale-95 transition-all disabled:opacity-30`}>
                            Generate Cinematic Motion
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
