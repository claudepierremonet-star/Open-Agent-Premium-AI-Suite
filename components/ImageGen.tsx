
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MODELS, AIModel } from '../constants';

interface ImageGenProps {
    onBack: () => void;
}

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export const ImageGen: React.FC<ImageGenProps> = ({ onBack }) => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
    const [selectedEngine, setSelectedEngine] = useState<AIModel>(MODELS.find(m => m.id === 'nano-banana') || MODELS[3]);

    const imageEngines = MODELS.filter(m => m.type === 'image');

    const generateImage = async () => {
        if (!prompt.trim() || isGenerating) return;

        setIsGenerating(true);
        setGeneratedImageUrl(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            // Logic: if engine is nano-banana, use flash-image.
            // For simulation, we use gemini-3-pro-image-preview for other 'high end' engines if available
            const modelToUse = selectedEngine.id === 'nano-banana' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
            
            const response = await ai.models.generateContent({
                model: modelToUse as any,
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    imageConfig: {
                        aspectRatio: aspectRatio,
                        imageSize: modelToUse === 'gemini-3-pro-image-preview' ? "1K" : undefined
                    }
                }
            });

            const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
            if (imagePart?.inlineData) {
                const base64Data = imagePart.inlineData.data;
                setGeneratedImageUrl(`data:${imagePart.inlineData.mimeType};base64,${base64Data}`);
            }
        } catch (error) {
            console.error("Image Generation Error:", error);
        } finally {
            setIsGenerating(false);
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
                        <h1 className="text-lg font-bold">Photo AI</h1>
                        <p className={`text-[9px] ${selectedEngine.color} font-bold uppercase tracking-widest`}>Engine: {selectedEngine.name}</p>
                    </div>
                </div>
                <div className={`size-10 rounded-full ${selectedEngine.bgColor} flex items-center justify-center border border-white/10`}>
                    <span className={`material-symbols-outlined ${selectedEngine.color}`}>{selectedEngine.icon}</span>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-24">
                {/* Engine Selector */}
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-1">Selec Engine</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {imageEngines.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setSelectedEngine(m)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border whitespace-nowrap transition-all ${
                                    selectedEngine.id === m.id ? 'bg-white/10 border-white/30 text-white shadow-neon' : 'bg-white/5 border-white/5 text-white/30'
                                }`}
                            >
                                <span className={`material-symbols-outlined text-[18px] ${m.color}`}>{m.icon}</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest">{m.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="aspect-square w-full rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden group shadow-inner">
                    {generatedImageUrl ? (
                        <>
                            <img src={generatedImageUrl} alt="Result" className="w-full h-full object-cover animate-in fade-in duration-700" />
                            <button onClick={() => {
                                const link = document.createElement('a');
                                link.href = generatedImageUrl!;
                                link.download = `photo-${Date.now()}.png`;
                                link.click();
                            }} className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white p-3 rounded-2xl border border-white/10">
                                <span className="material-symbols-outlined">download</span>
                            </button>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/10 text-center px-10">
                            {isGenerating ? (
                                <div className="flex flex-col items-center gap-6">
                                    <div className="relative size-16">
                                        <div className={`absolute inset-0 border-4 ${selectedEngine.color} opacity-10 rounded-full`}></div>
                                        <div className={`absolute inset-0 border-4 ${selectedEngine.color} border-t-transparent rounded-full animate-spin`}></div>
                                        <div className={`absolute inset-4 ${selectedEngine.bgColor} rounded-full animate-pulse flex items-center justify-center`}>
                                            <span className={`material-symbols-outlined ${selectedEngine.color}`}>{selectedEngine.icon}</span>
                                        </div>
                                    </div>
                                    <p className={`text-xs font-bold uppercase tracking-[0.3em] ${selectedEngine.color} animate-pulse`}>Rendering via {selectedEngine.name}...</p>
                                </div>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-6xl">image_search</span>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Awaiting prompt for {selectedEngine.name}</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-1">Prompt</p>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 text-white text-[14px] p-0 min-h-[100px] resize-none placeholder:text-white/10"
                            placeholder={`Describe your vision for ${selectedEngine.name}...`}
                        />
                    </div>
                </div>

                <button 
                    onClick={generateImage}
                    disabled={isGenerating || !prompt.trim()}
                    className={`w-full h-14 ${selectedEngine.bgColor.replace('/10', '')} text-white rounded-2xl font-bold text-lg shadow-neon flex items-center justify-center gap-3 transition-all disabled:opacity-30`}
                >
                    <span className="material-symbols-outlined">auto_fix_high</span>
                    {isGenerating ? 'Synthesizing...' : `Generate with ${selectedEngine.name}`}
                </button>
            </div>
        </div>
    );
};
