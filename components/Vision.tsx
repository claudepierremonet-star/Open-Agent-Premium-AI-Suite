
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ARHistoryItem } from '../types';

interface VisionProps {
    onBack: () => void;
}

export const Vision: React.FC<VisionProps> = ({ onBack }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    
    const [mode, setMode] = useState<'identify' | 'translate'>('identify');
    const [targetLang, setTargetLang] = useState('English');
    const [isCapturing, setIsCapturing] = useState(false);
    const [objectResult, setObjectResult] = useState<any>(null);
    const [translationResult, setTranslationResult] = useState<any>(null);
    const [playingTts, setPlayingTts] = useState(false);

    useEffect(() => {
        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
                });
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (err) {
                console.error("Camera error:", err);
            }
        }
        startCamera();
        return () => {
            const stream = videoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach(t => t.stop());
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    const captureFrame = () => {
        if (!videoRef.current || !canvasRef.current) return null;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
    };

    const handleVisionAction = async () => {
        const base64Image = captureFrame();
        if (!base64Image || isCapturing) return;

        setIsCapturing(true);
        setObjectResult(null);
        setTranslationResult(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            if (mode === 'identify') {
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: [{ parts: [{ inlineData: { data: base64Image, mimeType: 'image/jpeg' } }, { text: "Identifie l'objet principal. Donne nom, description et 3 faits en français sous JSON strict." }] }],
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                description: { type: Type.STRING },
                                facts: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                        }
                    }
                });
                setObjectResult(JSON.parse(response.text || "{}"));
            } else {
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: [{ parts: [{ inlineData: { data: base64Image, mimeType: 'image/jpeg' } }, { text: `Détecte le texte présent et traduis-le en ${targetLang}. Donne le texte original et la traduction sous JSON strict.` }] }],
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                original: { type: Type.STRING },
                                translated: { type: Type.STRING }
                            }
                        }
                    }
                });
                setTranslationResult(JSON.parse(response.text || "{}"));
            }
        } catch (error) {
            console.error("Vision Error:", error);
        } finally {
            setIsCapturing(false);
        }
    };

    const playTts = async (text: string) => {
        if (playingTts) return;
        setPlayingTts(true);
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
            }
            if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: `Prononce clairement en ${targetLang}: ${text}` }] }],
                config: {
                    // Correctly use Modality.AUDIO from @google/genai
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const ctx = audioContextRef.current;
                const binaryString = atob(base64Audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                const dataInt16 = new Int16Array(bytes.buffer);
                const audioBuffer = ctx.createBuffer(1, dataInt16.length, 24000);
                const channelData = audioBuffer.getChannelData(0);
                for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.onended = () => setPlayingTts(false);
                source.start();
            } else setPlayingTts(false);
        } catch (error) {
            console.error(error);
            setPlayingTts(false);
        }
    };

    return (
        <div className="relative h-full w-full bg-black flex flex-col">
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 z-0">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-90" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="size-72 border-2 border-white/20 rounded-[4rem] relative">
                         <div className="absolute -top-1 -left-1 size-10 border-t-4 border-l-4 border-primary rounded-tl-[3.5rem]"></div>
                         <div className="absolute -bottom-1 -right-1 size-10 border-b-4 border-r-4 border-primary rounded-br-[3.5rem]"></div>
                    </div>
                </div>
            </div>

            <header className="relative z-40 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={onBack} className="size-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-95 transition-all">
                    <span className="material-symbols-outlined font-bold">arrow_back</span>
                </button>
                <div className="flex bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-1">
                    <button onClick={() => setMode('identify')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'identify' ? 'bg-primary text-white shadow-lg' : 'text-white/40'}`}>Identification</button>
                    <button onClick={() => setMode('translate')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'translate' ? 'bg-primary text-white shadow-lg' : 'text-white/40'}`}>Traduction</button>
                </div>
            </header>

            <div className="flex-1"></div>

            <div className="p-8 bg-white/5 backdrop-blur-xl rounded-t-[3rem] border-t border-white/10 relative z-40">
                {mode === 'translate' && !translationResult && (
                    <div className="mb-6 flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                        {['English', 'Spanish', 'Japanese', 'German', 'Chinese'].map(lang => (
                            <button key={lang} onClick={() => setTargetLang(lang)} className={`px-5 py-2.5 rounded-full border-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${targetLang === lang ? 'bg-primary border-primary text-white' : 'bg-white border-intl-border text-graphite/40'}`}>
                                {lang}
                            </button>
                        ))}
                    </div>
                )}

                <button onClick={handleVisionAction} disabled={isCapturing} className="w-full h-20 bg-primary text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-2xl active:scale-95 transition-all border-b-8 border-orange-700">
                    {isCapturing ? (
                        <div className="size-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <span className="material-symbols-outlined text-3xl">{mode === 'identify' ? 'photo_camera' : 'translate'}</span>
                    )}
                    {isCapturing ? 'Analyse...' : (mode === 'identify' ? 'Scanner Objet' : 'Scanner Texte')}
                </button>
            </div>

            {objectResult && (
                <div className="absolute top-[20%] inset-x-6 z-[70] bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 border-l-[12px] border-primary">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-black text-graphite uppercase tracking-tighter">{objectResult.name}</h3>
                        <button onClick={() => setObjectResult(null)} className="size-10 rounded-full bg-stellar flex items-center justify-center">
                            <span className="material-symbols-outlined text-graphite/40">close</span>
                        </button>
                    </div>
                    <p className="text-sm font-bold text-graphite/60 italic mb-6 leading-relaxed">"{objectResult.description}"</p>
                    <div className="space-y-3">
                        {objectResult.facts?.map((f: string, i: number) => (
                            <div key={i} className="p-4 bg-stellar rounded-2xl text-[11px] font-black uppercase tracking-tight text-graphite/80 border border-intl-border shadow-sm">
                                • {f}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {translationResult && (
                <div className="absolute top-[25%] inset-x-6 z-[70] bg-white rounded-[3rem] p-10 shadow-2xl animate-in slide-in-from-bottom-10 border-l-[12px] border-primary">
                    <div className="flex justify-between items-center mb-8">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-graphite/20">Traduction Live</span>
                        <button onClick={() => setTranslationResult(null)}><span className="material-symbols-outlined text-graphite/30">close</span></button>
                    </div>
                    <div className="space-y-8">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-graphite/30 mb-2">Original</p>
                            <p className="text-lg font-bold text-graphite/40 italic leading-snug">"{translationResult.original}"</p>
                        </div>
                        <button 
                            onClick={() => playTts(translationResult.translated)}
                            className={`w-full p-8 rounded-[2.5rem] bg-stellar border-2 border-intl-border flex flex-col items-center gap-4 transition-all hover:border-primary/40 active:scale-95 relative group overflow-hidden ${playingTts ? 'ring-4 ring-primary/20' : ''}`}
                        >
                            <div className="absolute top-0 left-0 w-2 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <span className={`material-symbols-outlined text-4xl text-primary font-black ${playingTts ? 'animate-pulse' : ''}`}>
                                {playingTts ? 'graphic_eq' : 'volume_up'}
                            </span>
                            <div className="text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-2">Tap to Listen</p>
                                <p className="text-2xl font-black text-graphite leading-tight uppercase tracking-tighter">"{translationResult.translated}"</p>
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
