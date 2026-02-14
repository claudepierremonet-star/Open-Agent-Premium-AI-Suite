
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

interface AudioToPhotoProps {
    onBack: () => void;
}

export const AudioToPhoto: React.FC<AudioToPhotoProps> = ({ onBack }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processAudio = async () => {
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
                            { text: "Analyze the core emotion of this audio. Describe a professional artistic visual scene. Output only the prompt in English." }
                        ]
                    }
                });

                const imageResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: [{ parts: [{ text: analysisResponse.text || "Artistic representation of sound." }] }],
                });

                const imagePart = imageResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
                if (imagePart?.inlineData) {
                    setResultImage(`data:image/png;base64,${imagePart.inlineData.data}`);
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
                        <h1 className="text-lg font-black tracking-tight text-graphite">AUDIO2PHOTO</h1>
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Synesthesia Engine</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <div className="aspect-square w-full rounded-2xl bg-white border border-intl-border relative overflow-hidden shadow-sm">
                    {resultImage ? (
                        <img src={resultImage} alt="Result" className="w-full h-full object-cover" />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-10 text-center">
                            {isProcessing ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">PROCESSING AUDIO...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="size-16 rounded-full bg-stellar border border-intl-border flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl text-graphite/20">graphic_eq</span>
                                    </div>
                                    <p className="text-[10px] font-black text-graphite/40 uppercase tracking-widest">Select an audio file</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {!isProcessing && !resultImage && (
                    <div className="space-y-6">
                        <input type="file" accept="audio/*" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                        <button onClick={() => fileInputRef.current?.click()} className="w-full p-12 bg-white border-2 border-dashed border-intl-border rounded-2xl flex flex-col items-center gap-4 hover:border-primary/40 transition-all group">
                            <span className="material-symbols-outlined text-4xl text-graphite/20 group-hover:text-primary transition-colors">upload_file</span>
                            <span className="text-[11px] font-black text-graphite/40 uppercase tracking-widest">{file ? file.name : "Choose audio track"}</span>
                        </button>
                        <button onClick={processAudio} disabled={!file} className="w-full h-16 bg-graphite text-white rounded-xl font-black text-sm uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-3 disabled:opacity-20">
                            Generate Image
                        </button>
                    </div>
                )}

                {resultImage && (
                    <button onClick={() => { setFile(null); setResultImage(null); }} className="w-full h-14 border border-intl-border rounded-xl text-[10px] font-black uppercase tracking-widest text-graphite hover:bg-white transition-all">
                        New Conversion
                    </button>
                )}
            </div>
        </div>
    );
};
