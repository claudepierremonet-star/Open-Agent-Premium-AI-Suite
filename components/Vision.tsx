
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

interface VisionProps {
    onBack: () => void;
}

interface TextDetection {
    original: string;
    translated: string;
    box: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
}

interface ObjectIDResult {
    name: string;
    description: string;
    facts: string[];
}

type VisionMode = 'identify' | 'translate';
type TargetLanguage = 'French' | 'Chinese' | 'English' | 'Spanish' | 'German' | 'Japanese' | 'Korean';

const LANGUAGES: { code: TargetLanguage; flag: string; label: string }[] = [
    { code: 'English', flag: '🇺🇸', label: 'EN' },
    { code: 'Chinese', flag: '🇨🇳', label: 'ZH' },
    { code: 'French', flag: '🇫🇷', label: 'FR' },
    { code: 'Spanish', flag: '🇪🇸', label: 'ES' },
    { code: 'German', flag: '🇩🇪', label: 'DE' },
    { code: 'Japanese', flag: '🇯🇵', label: 'JA' },
    { code: 'Korean', flag: '🇰🇷', label: 'KO' },
];

export const Vision: React.FC<VisionProps> = ({ onBack }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mode, setMode] = useState<VisionMode>('translate');
    const [targetLang, setTargetLang] = useState<TargetLanguage>('English');
    const [isScanning, setIsScanning] = useState(false);
    const [detections, setDetections] = useState<TextDetection[]>([]);
    const [objectResult, setObjectResult] = useState<ObjectIDResult | null>(null);

    // Initialize Camera
    useEffect(() => {
        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    } 
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
        };
    }, []);

    const saveTranslationToHistory = useCallback((newDetections: TextDetection[], thumbnail?: string) => {
        if (newDetections.length === 0) return;
        
        navigator.geolocation.getCurrentPosition((pos) => {
            const stored = localStorage.getItem('openagent_ar_history');
            let history = stored ? JSON.parse(stored) : [];
            const newItems = newDetections.map(d => ({
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                original: d.original,
                translated: d.translated,
                lang: targetLang,
                timestamp: new Date().toISOString(),
                image: thumbnail,
                location: {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                }
            }));
            history = [...newItems, ...history].slice(0, 50);
            localStorage.setItem('openagent_ar_history', JSON.stringify(history));
        }, () => {
            const stored = localStorage.getItem('openagent_ar_history');
            let history = stored ? JSON.parse(stored) : [];
            const newItems = newDetections.map(d => ({
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                original: d.original,
                translated: d.translated,
                lang: targetLang,
                timestamp: new Date().toISOString(),
                image: thumbnail
            }));
            history = [...newItems, ...history].slice(0, 50);
            localStorage.setItem('openagent_ar_history', JSON.stringify(history));
        });
    }, [targetLang]);

    const performTranslateScan = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || mode !== 'translate' || isScanning) return;

        setIsScanning(true);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 150;
        thumbCanvas.height = 100;
        thumbCanvas.getContext('2d')?.drawImage(canvas, 0, 0, 150, 100);
        const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.5);

        const base64Image = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [
                    {
                        parts: [
                            { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
                            { text: `Détecte tous les blocs de texte. Traduis-les en ${targetLang}. Retourne uniquement un JSON array avec original, translated et box [ymin, xmin, ymax, xmax] (0-1000).` }
                        ]
                    }
                ],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                original: { type: Type.STRING },
                                translated: { type: Type.STRING },
                                box: { type: Type.ARRAY, items: { type: Type.NUMBER }, minItems: 4, maxItems: 4 }
                            },
                            required: ["original", "translated", "box"]
                        }
                    }
                }
            });

            const result = JSON.parse(response.text || "[]") as TextDetection[];
            setDetections(result);
            if (result.length > 0) saveTranslationToHistory(result, thumbnail);
        } catch (error) {
            console.error("Translate Scan Error:", error);
        } finally {
            setIsScanning(false);
        }
    }, [mode, isScanning, targetLang, saveTranslationToHistory]);

    useEffect(() => {
        let interval: number;
        if (mode === 'translate') {
            interval = window.setInterval(() => {
                if (!isScanning) performTranslateScan();
            }, 8000); 
        } else {
            setDetections([]);
        }
        return () => clearInterval(interval);
    }, [mode, performTranslateScan, isScanning]);

    return (
        <div className="relative h-full w-full bg-black overflow-hidden flex flex-col">
            <canvas ref={canvasRef} className="hidden" />

            {/* Video Background */}
            <div className="absolute inset-0 z-0">
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)] pointer-events-none"></div>
            </div>

            {/* AR Overlays Haute Visibilité */}
            {mode === 'translate' && (
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {detections.map((det, i) => {
                        const [ymin, xmin, ymax, xmax] = det.box;
                        return (
                            <div 
                                key={i}
                                className="absolute bg-white border-2 border-primary rounded-xl px-3 py-2 flex flex-col transition-all duration-700 shadow-2xl animate-in zoom-in-50"
                                style={{
                                    top: `${ymin / 10}%`,
                                    left: `${xmin / 10}%`,
                                    width: `${(xmax - xmin) / 10}%`,
                                    height: `${(ymax - ymin) / 10}%`,
                                    minWidth: '100px',
                                    maxWidth: '250px'
                                }}
                            >
                                <span className="text-[8px] text-graphite/40 uppercase font-black tracking-widest mb-1 truncate">{det.original}</span>
                                <span className="text-[13px] text-graphite font-black leading-tight break-words uppercase">{det.translated}</span>
                                <div className="absolute -bottom-1.5 left-4 size-3 bg-white border-b-2 border-r-2 border-primary rotate-45"></div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Header Haute Visibilité */}
            <header className="relative z-40 p-6 flex items-center justify-between bg-gradient-to-b from-white/90 to-transparent backdrop-blur-[2px]">
                <button 
                    onClick={onBack} 
                    className="size-12 rounded-2xl bg-white border-2 border-intl-border shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-graphite"
                >
                    <span className="material-symbols-outlined text-3xl font-bold">arrow_back</span>
                </button>
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border-2 border-primary/20 text-primary">
                        <span className="size-2 rounded-full bg-primary animate-pulse"></span>
                        <span className="text-[9px] font-black uppercase tracking-widest">Vision AR Acticve</span>
                    </div>
                </div>
            </header>

            {/* Viewfinder Stylisé */}
            <div className="relative flex-1 flex items-center justify-center pointer-events-none">
                <div className={`size-72 border-2 border-white/20 rounded-[3rem] transition-all duration-1000 relative ${isScanning ? 'scale-90 border-primary/40 bg-primary/5 shadow-[0_0_100px_rgba(255,79,0,0.1)]' : 'scale-100'}`}>
                    <div className="absolute -top-1 -left-1 size-16 border-t-4 border-l-4 border-primary rounded-tl-[2.5rem] shadow-[0_0_20px_rgba(255,79,0,0.3)]"></div>
                    <div className="absolute -bottom-1 -right-1 size-16 border-b-4 border-r-4 border-primary rounded-br-[2.5rem] shadow-[0_0_20px_rgba(255,79,0,0.3)]"></div>
                    
                    {isScanning && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_25px_#FF4F00] animate-[scan-line_2.5s_ease-in-out_infinite]"></div>
                    )}

                    {isScanning && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary animate-pulse">Scanning Intelligence...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls Hub Haute Visibilité */}
            <div className="relative z-40 p-8 bg-white border-t-4 border-primary/20 rounded-t-[3rem] shadow-[0_-20px_40px_rgba(0,0,0,0.2)]">
                {/* Mode Selector */}
                <div className="flex bg-stellar border-2 border-intl-border rounded-[2rem] p-1.5 mb-8 shadow-inner">
                    <button 
                        onClick={() => setMode('identify')} 
                        className={`flex-1 py-4 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'identify' ? 'bg-primary text-white shadow-xl scale-[1.02]' : 'text-graphite/40 hover:text-graphite hover:bg-white'}`}
                    >
                        Identifier
                    </button>
                    <button 
                        onClick={() => setMode('translate')} 
                        className={`flex-1 py-4 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'translate' ? 'bg-primary text-white shadow-xl scale-[1.02]' : 'text-graphite/40 hover:text-graphite hover:bg-white'}`}
                    >
                        Traduire
                    </button>
                </div>
                
                {/* Language Selector Pills */}
                {mode === 'translate' && (
                    <div className="flex gap-3 overflow-x-auto pb-6 custom-scrollbar no-scrollbar mask-fade-edges">
                        {LANGUAGES.map(lang => (
                            <button 
                                key={lang.code} 
                                onClick={() => setTargetLang(lang.code)} 
                                className={`px-6 py-3.5 rounded-2xl text-[10px] font-black border-2 whitespace-nowrap transition-all shadow-sm flex items-center gap-3 ${targetLang === lang.code ? 'bg-graphite border-graphite text-white scale-110 shadow-xl' : 'bg-white border-intl-border text-graphite/40 hover:border-graphite/20'}`}
                            >
                                <span className="text-lg">{lang.flag}</span>
                                <span className="uppercase tracking-widest">{lang.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes scan-line {
                    0% { top: 0; opacity: 0; transform: scaleX(0.5); }
                    15% { opacity: 1; transform: scaleX(1); }
                    85% { opacity: 1; transform: scaleX(1); }
                    100% { top: 100%; opacity: 0; transform: scaleX(0.5); }
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .mask-fade-edges {
                    mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
                }
            `}</style>
        </div>
    );
};
