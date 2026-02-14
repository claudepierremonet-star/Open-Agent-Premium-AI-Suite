
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
    const [keyError, setKeyError] = useState(false);

    const imageEngines = MODELS.filter(m => m.type === 'image');

    const handleKeySelection = async () => {
        try {
            await (window as any).aistudio.openSelectKey();
            setKeyError(false);
        } catch (err) {
            console.error("Key selection failed", err);
        }
    };

    const generateImage = async () => {
        if (!prompt.trim() || isGenerating) return;

        const modelToUse = selectedEngine.id === 'nano-banana' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
        if (modelToUse === 'gemini-3-pro-image-preview') {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            if (!hasKey) {
                setKeyError(true);
                return;
            }
        }

        setIsGenerating(true);
        setGeneratedImageUrl(null);
        setIsValidated(false);
        setKeyError(false);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
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
        } catch (error: any) {
            console.error("Image Generation Error:", error);
            if (error.message?.includes("PERMISSION_DENIED") || error.message?.includes("Requested entity was not found")) {
                setKeyError(true);
            } else {
                alert("Erreur technique lors de la génération. Réessayez plus tard.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleValidate = () => {
        if (!generatedImageUrl) return;
        setIsValidated(true);
        const link = document.createElement('a');
        link.href = generatedImageUrl;
        link.download = `openagent-gen-${Date.now()}.png`;
        link.click();
        setTimeout(() => setIsValidated(false), 3000);
    };

    return (
        <div className="flex flex-col h-full bg-stellar animate-in fade-in duration-500">
            {/* Header */}
            <header className="px-6 py-5 border-b-2 border-intl-border bg-white sticky top-0 z-30 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="size-11 rounded-xl bg-white border-2 border-intl-border flex items-center justify-center hover:bg-stellar hover:border-graphite/20 transition-all text-graphite shadow-sm active:scale-95">
                        <span className="material-symbols-outlined font-bold">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-graphite tracking-tighter uppercase leading-tight">Générateur Photo</h1>
                        <div className="flex items-center gap-2">
                            <span className={`size-2 rounded-full ${isGenerating ? 'bg-primary animate-pulse' : 'bg-green-500'}`}></span>
                            <p className="text-[10px] font-black text-graphite uppercase tracking-[0.2em]">Ready</p>
                        </div>
                    </div>
                </div>
                <div className={`size-12 rounded-2xl ${selectedEngine.bgColor} border-2 border-white flex items-center justify-center shadow-lg`}>
                    <span className={`material-symbols-outlined ${selectedEngine.color} text-2xl font-bold`}>{selectedEngine.icon}</span>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar pb-40">
                {keyError && selectedEngine.id !== 'nano-banana' && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 animate-in slide-in-from-top-4">
                        <button onClick={handleKeySelection} className="w-full py-3.5 bg-amber-500 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest active:scale-95 shadow-lg">Activer ma clé Pro</button>
                    </div>
                )}

                {/* Preview Area */}
                <div className="aspect-square w-full rounded-[2.5rem] bg-white border-4 border-intl-border relative overflow-hidden shadow-2xl transition-all">
                    {generatedImageUrl ? (
                        <div className="relative w-full h-full">
                            <img src={generatedImageUrl} alt="Result" className="w-full h-full object-cover animate-in zoom-in-95 duration-700" />
                            {isValidated && (
                                <div className="absolute inset-0 bg-green-500/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-300">
                                    <span className="material-symbols-outlined text-7xl text-white font-black animate-bounce">check_circle</span>
                                    <p className="text-white font-black text-lg uppercase tracking-widest mt-4">Validé</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-10">
                            {isGenerating ? (
                                <div className="flex flex-col items-center gap-8">
                                    <div className="size-20 border-[8px] border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary animate-pulse italic">Synthèse neuronale...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="size-24 rounded-full bg-stellar border-4 border-intl-border flex items-center justify-center mb-2 shadow-inner">
                                        <span className="material-symbols-outlined text-5xl text-graphite/10">brush</span>
                                    </div>
                                    <h4 className="text-sm font-black text-graphite uppercase tracking-[0.2em]">En attente de vision</h4>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Prompt Section */}
                <section className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-graphite/30 ml-2">Description Visuelle</h3>
                    <div className="bg-white border-2 border-intl-border rounded-3xl p-6 shadow-inner focus-within:border-primary/40 transition-all">
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 text-graphite text-[15px] font-bold p-0 min-h-[100px] resize-none placeholder:text-graphite/10"
                            placeholder="Décrivez votre idée artistique..."
                        />
                    </div>
                </section>

                {/* Format & Validation (Rapprochés) */}
                <section className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-graphite/30 ml-2">Paramètres de Rendu</h3>
                    <div className="space-y-5">
                        <div className="flex bg-white border-2 border-intl-border rounded-[2rem] p-1.5 shadow-sm">
                            {(["1:1", "16:9", "9:16", "4:3", "3:4"] as AspectRatio[]).map((ratio) => (
                                <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`flex-1 py-3.5 rounded-[1.5rem] text-[10px] font-black transition-all ${aspectRatio === ratio ? 'bg-graphite text-white shadow-xl scale-[1.05]' : 'text-graphite/40 hover:text-graphite'}`}>{ratio}</button>
                            ))}
                        </div>

                        {/* Validation Bouton - Placé juste ici pour la proximité maximale */}
                        {generatedImageUrl && !isGenerating && (
                            <button 
                                onClick={handleValidate}
                                className={`w-full py-6 rounded-[2.5rem] flex items-center justify-center gap-4 transition-all shadow-[0_20px_50px_rgba(34,197,94,0.3)] active:scale-95 border-b-8 ${isValidated ? 'bg-green-600 border-green-800' : 'bg-green-500 border-green-700'} text-white animate-in slide-in-from-top-4`}
                            >
                                <span className="material-symbols-outlined text-3xl font-black">download</span>
                                <span className="text-[13px] font-black uppercase tracking-[0.2em]">Valider & Enregistrer</span>
                            </button>
                        )}
                    </div>
                </section>
            </div>

            {/* Bottom Primary Action - GÉNÉRER */}
            <footer className="fixed bottom-0 inset-x-0 p-6 bg-gradient-to-t from-stellar via-stellar to-transparent z-40 max-w-md mx-auto">
                {!generatedImageUrl && (
                    <button 
                        onClick={generateImage}
                        disabled={isGenerating || !prompt.trim()}
                        className="w-full h-20 bg-primary text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-[0_15px_40px_rgba(255,79,0,0.3)] flex items-center justify-center gap-4 active:scale-[0.97] transition-all disabled:opacity-20 border-b-8 border-orange-700"
                    >
                        <span className="material-symbols-outlined text-3xl font-bold">auto_awesome</span>
                        {isGenerating ? 'Calcul...' : 'Générer la Photo'}
                    </button>
                )}
                {generatedImageUrl && (
                    <button onClick={() => { setGeneratedImageUrl(null); setPrompt(''); }} className="w-full h-16 bg-white border-2 border-intl-border text-graphite rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-lg flex items-center justify-center gap-4 active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-2xl">refresh</span>
                        Nouveau Concept
                    </button>
                )}
            </footer>
        </div>
    );
};
