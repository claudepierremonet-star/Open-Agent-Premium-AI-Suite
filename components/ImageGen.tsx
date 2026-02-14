
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
    const [isValidated, setIsValidated] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
    const [selectedEngine, setSelectedEngine] = useState<AIModel>(MODELS.find(m => m.id === 'nano-banana') || MODELS[3]);

    const imageEngines = MODELS.filter(m => m.type === 'image');

    const generateImage = async () => {
        if (!prompt.trim() || isGenerating) return;

        setIsGenerating(true);
        setGeneratedImageUrl(null);
        setIsValidated(false);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

    const handleValidate = () => {
        if (!generatedImageUrl) return;
        
        setIsValidated(true);
        
        // Simuler un enregistrement et proposer le téléchargement
        const link = document.createElement('a');
        link.href = generatedImageUrl;
        link.download = `openagent-gen-${Date.now()}.png`;
        link.click();

        // Feedback succès temporaire avant retour ou reset
        setTimeout(() => {
            setIsValidated(false);
        }, 3000);
    };

    return (
        <div className="flex flex-col h-full bg-stellar animate-in fade-in duration-500">
            {/* Header Haute Visibilité */}
            <header className="px-6 py-5 border-b-2 border-intl-border bg-white sticky top-0 z-30 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack} 
                        className="size-11 rounded-xl bg-white border-2 border-intl-border flex items-center justify-center hover:bg-stellar hover:border-graphite/20 transition-all text-graphite shadow-sm active:scale-95"
                    >
                        <span className="material-symbols-outlined font-bold">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-graphite tracking-tighter uppercase leading-tight">Générateur Photo</h1>
                        <div className="flex items-center gap-2">
                            <span className={`size-2 rounded-full ${isGenerating ? 'bg-primary animate-pulse' : 'bg-green-500'}`}></span>
                            <p className="text-[10px] font-black text-graphite/40 uppercase tracking-[0.2em]">Système Prêt</p>
                        </div>
                    </div>
                </div>
                <div className={`size-12 rounded-2xl ${selectedEngine.bgColor} border-2 border-white flex items-center justify-center shadow-lg transition-transform hover:scale-110`}>
                    <span className={`material-symbols-outlined ${selectedEngine.color} text-2xl font-bold`}>{selectedEngine.icon}</span>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-40">
                
                {/* Engine Selector Cards */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-graphite/30">Moteur de Rendu</h3>
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">AI v4.2</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {imageEngines.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setSelectedEngine(m)}
                                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                                    selectedEngine.id === m.id 
                                    ? `bg-white border-primary shadow-xl scale-[1.02]` 
                                    : 'bg-white/50 border-intl-border text-graphite/40 hover:border-graphite/20'
                                }`}
                            >
                                <span className={`material-symbols-outlined text-[24px] ${selectedEngine.id === m.id ? m.color : 'text-graphite/20'} font-bold`}>{m.icon}</span>
                                <span className={`text-[11px] font-black uppercase tracking-tight ${selectedEngine.id === m.id ? 'text-graphite' : 'text-graphite/40'}`}>{m.name}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Main Preview Area */}
                <div className="aspect-square w-full rounded-[2.5rem] bg-white border-4 border-intl-border relative overflow-hidden shadow-2xl transition-all">
                    {generatedImageUrl ? (
                        <div className="relative w-full h-full group">
                            <img src={generatedImageUrl} alt="Result" className="w-full h-full object-cover animate-in zoom-in-95 duration-700" />
                            
                            {isValidated && (
                                <div className="absolute inset-0 bg-green-500/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-300">
                                    <span className="material-symbols-outlined text-7xl text-white animate-bounce font-black">check_circle</span>
                                    <p className="text-white font-black text-lg uppercase tracking-widest mt-4">Image Validée</p>
                                </div>
                            )}

                            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setGeneratedImageUrl(null)} className="text-white/60 hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-3xl">delete</span>
                                </button>
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Aperçu HD</span>
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-10">
                            {isGenerating ? (
                                <div className="flex flex-col items-center gap-8">
                                    <div className="relative size-24">
                                        <div className={`absolute inset-0 border-[10px] ${selectedEngine.color} opacity-10 rounded-full`}></div>
                                        <div className={`absolute inset-0 border-[10px] ${selectedEngine.color} border-t-transparent rounded-full animate-spin`}></div>
                                        <div className={`absolute inset-6 ${selectedEngine.bgColor} rounded-full animate-pulse flex items-center justify-center`}>
                                            <span className={`material-symbols-outlined ${selectedEngine.color} text-4xl font-bold`}>{selectedEngine.icon}</span>
                                        </div>
                                    </div>
                                    <p className={`text-[12px] font-black uppercase tracking-[0.4em] ${selectedEngine.color} animate-pulse`}>Synthèse Neuronale...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="size-24 rounded-full bg-stellar border-4 border-intl-border flex items-center justify-center mb-2 shadow-inner">
                                        <span className="material-symbols-outlined text-5xl text-graphite/10">brush</span>
                                    </div>
                                    <h4 className="text-sm font-black text-graphite/30 uppercase tracking-[0.2em]">En attente d'instruction</h4>
                                    <p className="text-[10px] text-graphite/20 font-bold uppercase tracking-widest leading-relaxed">Saisissez votre prompt ci-dessous</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Validation Area - HIGH VISIBILITY BUTTON */}
                {generatedImageUrl && !isGenerating && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <button 
                            onClick={handleValidate}
                            className={`w-full py-6 rounded-[2rem] flex items-center justify-center gap-4 transition-all shadow-[0_15px_40px_rgba(34,197,94,0.3)] active:scale-95 border-b-8 ${isValidated ? 'bg-green-600 border-green-800' : 'bg-green-500 border-green-700'} text-white`}
                        >
                            <span className="material-symbols-outlined text-3xl font-black">check_circle</span>
                            <span className="text-sm font-black uppercase tracking-[0.3em]">Valider & Enregistrer</span>
                        </button>
                    </div>
                )}

                {/* Prompt Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-graphite/30">Description (Prompt)</h3>
                        <button onClick={() => setPrompt('')} className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 transition-colors font-bold underline underline-offset-4">Effacer tout</button>
                    </div>
                    <div className="bg-white border-2 border-intl-border rounded-3xl p-6 shadow-inner focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5 transition-all min-h-[140px] flex flex-col">
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full flex-1 bg-transparent border-none focus:ring-0 text-graphite text-[16px] font-bold p-0 resize-none placeholder:text-graphite/10"
                            placeholder={`Décrivez votre vision... "Un astronaute sur Mars, style peinture à l'huile..."`}
                        />
                    </div>
                </section>

                {/* Format Selector */}
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-graphite/30 px-1">Format de l'image</h3>
                    <div className="flex bg-white border-2 border-intl-border rounded-[2rem] p-1.5 shadow-sm">
                        {(["1:1", "16:9", "9:16", "4:3", "3:4"] as AspectRatio[]).map((ratio) => (
                            <button 
                                key={ratio} 
                                onClick={() => setAspectRatio(ratio)} 
                                className={`flex-1 py-3 rounded-[1.5rem] text-[11px] font-black transition-all ${aspectRatio === ratio ? 'bg-graphite text-white shadow-xl scale-[1.05]' : 'text-graphite/40 hover:text-graphite hover:bg-stellar'}`}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            {/* Bottom Primary Action - GÉNÉRER */}
            <footer className="fixed bottom-0 inset-x-0 p-6 bg-gradient-to-t from-stellar via-stellar to-transparent z-40 max-w-md mx-auto">
                {!generatedImageUrl && (
                    <button 
                        onClick={generateImage}
                        disabled={isGenerating || !prompt.trim()}
                        className="w-full h-20 bg-primary text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-[0_15px_40px_rgba(255,79,0,0.3)] flex items-center justify-center gap-4 active:scale-[0.97] transition-all disabled:opacity-20 disabled:shadow-none border-b-8 border-orange-700"
                    >
                        <span className="material-symbols-outlined text-3xl font-bold">auto_awesome</span>
                        {isGenerating ? 'Calcul en cours...' : `Générer`}
                    </button>
                )}
                {generatedImageUrl && (
                    <button 
                        onClick={() => { setGeneratedImageUrl(null); setPrompt(''); }}
                        className="w-full h-16 bg-white border-2 border-intl-border text-graphite/40 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-lg flex items-center justify-center gap-4 active:scale-[0.97] transition-all"
                    >
                        <span className="material-symbols-outlined text-2xl">refresh</span>
                        Nouvelle Création
                    </button>
                )}
            </footer>
        </div>
    );
};
