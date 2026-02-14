
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
                image: thumbnail, // Sauvegarde de la vignette
                location: {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                }
            }));
            history = [...newItems, ...history].slice(0, 50);
            localStorage.setItem('openagent_ar_history', JSON.stringify(history));
        }, () => {
            // Fallback sans GPS
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
        
        // Création d'une vignette plus petite pour le stockage
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
                            { text: `Detect all visible text blocks. Provide the original text and its accurate translation into ${targetLang}. For Chinese, ensure high precision in character recognition. Also provide the bounding box [ymin, xmin, ymax, xmax] scaled 0-1000. Return as a JSON array.` }
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

    // Loop for translation scans
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
                    className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none"></div>
            </div>

            {/* AR Overlays */}
            {mode === 'translate' && (
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {detections.map((det, i) => {
                        const [ymin, xmin, ymax, xmax] = det.box;
                        return (
                            <div 
                                key={i}
                                className="absolute border border-primary/50 bg-primary/20 backdrop-blur-md rounded px-2 py-1 flex flex-col transition-all duration-500 shadow-neon"
                                style={{
                                    top: `${ymin / 10}%`,
                                    left: `${xmin / 10}%`,
                                    width: `${(xmax - xmin) / 10}%`,
                                    height: `${(ymax - ymin) / 10}%`,
                                    minWidth: '70px'
                                }}
                            >
                                <span className="text-[7px] text-white/40 uppercase font-black truncate">{det.original}</span>
                                <span className="text-[11px] text-white font-bold leading-tight drop-shadow-md">{det.translated}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Header */}
            <header className="relative z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={onBack} className="size-10 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center border border-white/10">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </header>

            {/* Viewfinder */}
            <div className="relative flex-1 flex items-center justify-center pointer-events-none">
                <div className={`size-64 border border-white/10 rounded-3xl transition-all duration-700 relative ${isScanning ? 'scale-90 border-primary/50' : 'scale-100'}`}>
                    <div className="absolute -top-1 -left-1 size-12 border-t-2 border-l-2 border-primary rounded-tl-2xl shadow-neon"></div>
                    <div className="absolute -bottom-1 -right-1 size-12 border-b-2 border-r-2 border-primary rounded-br-2xl shadow-neon"></div>
                    {isScanning && <div className="absolute top-0 left-0 w-full h-0.5 bg-primary shadow-neon animate-[scan-line_2s_ease-in-out_infinite]"></div>}
                </div>
            </div>

            {/* Mode Switcher */}
            <div className="relative z-30 p-6 bg-gradient-to-t from-black to-transparent">
                <div className="flex bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-1 mb-6">
                    <button onClick={() => setMode('identify')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'identify' ? 'bg-primary text-white shadow-neon' : 'text-white/30'}`}>Identify</button>
                    <button onClick={() => setMode('translate')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'translate' ? 'bg-primary text-white shadow-neon' : 'text-white/30'}`}>Translate</button>
                </div>
                
                {mode === 'translate' && (
                    <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar no-scrollbar">
                        {LANGUAGES.map(lang => (
                            <button key={lang.code} onClick={() => setTargetLang(lang.code)} className={`px-4 py-2 rounded-xl text-[9px] font-bold border whitespace-nowrap transition-all ${targetLang === lang.code ? 'bg-primary border-primary shadow-neon' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                {lang.flag} {lang.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes scan-line {
                    0% { top: 0; opacity: 0; }
                    5% { opacity: 1; }
                    95% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};
