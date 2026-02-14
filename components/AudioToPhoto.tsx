
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

interface AudioToPhotoProps {
    onBack: () => void;
}

export const AudioToPhoto: React.FC<AudioToPhotoProps> = ({ onBack }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'generating' | 'completed'>('idle');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [audioAnalysis, setAudioAnalysis] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResultImage(null);
            setAudioAnalysis(null);
            setStatus('idle');
        }
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = (error) => reject(error);
        });
    };

    const processAudio = async () => {
        if (!file) return;

        setIsProcessing(true);
        setStatus('analyzing');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const base64Audio = await fileToBase64(file);

            // Step 1: Analyze audio and generate a visual prompt
            const analysisResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        {
                            inlineData: {
                                mimeType: file.type,
                                data: base64Audio,
                            },
                        },
                        {
                            text: "Analyze the mood, rhythm, and emotions of this audio file. Then, describe a vivid, artistic, and highly detailed visual scene that perfectly represents this sound. Focus on lighting, colors, and atmosphere. Provide only the visual description in English for an image generator.",
                        },
                    ],
                },
            });

            const visualPrompt = analysisResponse.text;
            setAudioAnalysis(visualPrompt || "Ambience extraction successful.");
            setStatus('generating');

            // Step 2: Generate the image based on the analysis
            const imageResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: [{ parts: [{ text: visualPrompt || "A cosmic symphony of colors representing ambient sound." }] }],
                config: {
                    imageConfig: {
                        aspectRatio: "1:1"
                    }
                }
            });

            const imagePart = imageResponse.candidates?.[0]?.content?.parts.find(part => part.inlineData);
            if (imagePart?.inlineData) {
                setResultImage(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
                setStatus('completed');
            }
        } catch (error) {
            console.error("Audio Processing Error:", error);
            setStatus('idle');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background-dark overflow-hidden">
            <header className="px-6 py-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-background-dark/95 backdrop-blur-2xl z-20">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onBack}
                        className="size-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all"
                    >
                        <span className="material-symbols-outlined text-white/70">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold">Synesthésie IA</h1>
                        <p className="text-[9px] text-primary/70 font-bold uppercase tracking-widest">Audio to Vision</p>
                    </div>
                </div>
                <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                    <span className="material-symbols-outlined text-primary">graphic_eq</span>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Result Preview */}
                <div className="aspect-square w-full rounded-3xl bg-white/5 border border-white/10 relative overflow-hidden shadow-inner group">
                    {resultImage ? (
                        <>
                            <img src={resultImage} alt="Visual Sound" className="w-full h-full object-cover animate-in fade-in duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                <p className="text-[10px] text-white/80 leading-relaxed italic line-clamp-3">{audioAnalysis}</p>
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-10 text-center">
                            {isProcessing ? (
                                <>
                                    <div className="flex gap-1.5 items-end h-12">
                                        {[...Array(8)].map((_, i) => (
                                            <div 
                                                key={i} 
                                                className="w-1.5 bg-primary rounded-full animate-bounce"
                                                style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}
                                            ></div>
                                        ))}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary animate-pulse">
                                            {status === 'analyzing' ? 'Extraction de l\'âme sonore...' : 'Matérialisation visuelle...'}
                                        </p>
                                        <p className="text-[9px] text-white/30 font-medium italic">Gemini décode les fréquences émotionnelles</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="size-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-white/10">music_note</span>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest">En attente d'une onde</p>
                                        <p className="text-[10px] text-white/20">Chargez un MP3 ou WAV pour voir sa musique</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* File Upload Section */}
                {!isProcessing && status !== 'completed' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <input 
                            type="file" 
                            accept="audio/mp3,audio/wav,audio/mpeg" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full p-8 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center gap-4 ${
                                file ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-white/5 hover:border-white/20'
                            }`}
                        >
                            <span className={`material-symbols-outlined text-4xl ${file ? 'text-primary' : 'text-white/20'}`}>
                                {file ? 'audio_file' : 'cloud_upload'}
                            </span>
                            <div className="text-center">
                                <p className="text-sm font-bold">{file ? file.name : 'Sélectionner un fichier'}</p>
                                <p className="text-[10px] text-white/30 mt-1 uppercase tracking-widest">MP3 / WAV (Max 10MB)</p>
                            </div>
                        </button>

                        <button 
                            onClick={processAudio}
                            disabled={!file}
                            className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg shadow-neon flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-30 disabled:shadow-none"
                        >
                            <span className="material-symbols-outlined">auto_fix_high</span>
                            Générer la vision
                        </button>
                    </div>
                )}

                {status === 'completed' && (
                    <div className="flex flex-col gap-4 animate-in fade-in duration-500">
                        <button 
                            onClick={() => { setFile(null); setStatus('idle'); setResultImage(null); }}
                            className="w-full h-14 bg-white/5 border border-white/10 text-white rounded-2xl font-bold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">replay</span>
                            Nouvelle création
                        </button>
                        <button 
                            onClick={() => {
                                const link = document.createElement('a');
                                link.href = resultImage!;
                                link.download = `synesthesia-${Date.now()}.png`;
                                link.click();
                            }}
                            className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg shadow-neon flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                        >
                            <span className="material-symbols-outlined">download</span>
                            Enregistrer l'œuvre
                        </button>
                    </div>
                )}

                <div className="bg-surface-dark/40 border border-white/5 rounded-2xl p-4 flex gap-4 items-start opacity-60">
                    <span className="material-symbols-outlined text-primary text-sm">info</span>
                    <p className="text-[10px] leading-relaxed text-white/50">
                        La Synesthésie IA utilise Gemini 3 Pro pour interpréter les émotions musicales et les transformer en invites complexes pour Gemini 2.5 Flash Image.
                    </p>
                </div>
            </div>
        </div>
    );
};
