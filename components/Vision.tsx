
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type, Modality } from "@google/genai";

interface VisionProps {
    onBack: () => void;
}

interface TextDetection {
    id: string;
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
    const [mode, setMode] = useState<VisionMode>('identify');
    const [targetLang, setTargetLang] = useState<TargetLanguage>('English');
    const [isScanning, setIsScanning] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [showShutter, setShowShutter] = useState(false);
    const [detections, setDetections] = useState<TextDetection[]>([]);
    const [objectResult, setObjectResult] = useState<ObjectIDResult | null>(null);
    const [playingTtsId, setPlayingTtsId] = useState<string | null>(null);

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

    const captureFrame = () => {
        if (!videoRef.current || !canvasRef.current) return null;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return null;

        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
    };

    const handleManualAnalysis = async () => {
        if (isCapturing) return;
        
        // Visual feedback
        setShowShutter(true);
        setTimeout(() => setShowShutter(false), 150);
        
        const base64Image = captureFrame();
        if (!base64Image) return;

        setIsCapturing(true);
        setObjectResult(null);
        setDetections([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            if (mode === 'identify') {
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: [
                        {
                            parts: [
                                { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
                                { text: "Identifie l'objet principal au centre de l'image. Donne son nom, une description concise et 3 faits fascinants. Réponds en français sous forme de JSON strict." }
                            ]
                        }
                    ],
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                description: { type: Type.STRING },
                                facts: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ["name", "description", "facts"]
                        }
                    }
                });
                const result = JSON.parse(response.text || "{}") as ObjectIDResult;
                setObjectResult(result);
            } else {
                performTranslateScan(base64Image);
            }
        } catch (error) {
            console.error("Analysis Error:", error);
        } finally {
            setIsCapturing(false);
        }
    };

    const playTts = async (item: TextDetection) => {
        if (playingTtsId) return;
        setPlayingTtsId(item.id);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: `Prononce avec une voix naturelle en ${targetLang}: ${item.translated}` }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
                const binaryString = atob(base64Audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                
                const dataInt16 = new Int16Array(bytes.buffer);
                const audioBuffer = audioContext.createBuffer(1, dataInt16.length, 24000);
                const channelData = audioBuffer.getChannelData(0);
                for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.onended = () => setPlayingTtsId(null);
                source.start();
            } else {
                setPlayingTtsId(null);
            }
        } catch (error) {
            console.error("TTS Error:", error);
            setPlayingTtsId(null);
        }
    };

    const performTranslateScan = async (providedBase64?: string) => {
        const base64Image = providedBase64 || captureFrame();
        if (!base64Image || isScanning) return;

        setIsScanning(true);
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
                                box: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                            },
                            required: ["original", "translated", "box"]
                        }
                    }
                }
            });
            const rawResults = JSON.parse(response.text || "[]");
            const result = rawResults.map((r: any, idx: number) => ({
                ...r,
                id: `det-${Date.now()}-${idx}`
            })) as TextDetection[];
            setDetections(result);
        } catch (error) {
            console.error("Translate Scan Error:", error);
        } finally {
            setIsScanning(false);
        }
    };

    useEffect(() => {
        let interval: number;
        if (mode === 'translate' && !isCapturing) {
            interval = window.setInterval(() => {
                if (!isScanning) performTranslateScan();
            }, 12000); 
        }
        return () => clearInterval(interval);
    }, [mode, isScanning, isCapturing, targetLang]);

    return (
        <div className="relative h-full w-full bg-black overflow-hidden flex flex-col">
            <canvas ref={canvasRef} className="hidden" />

            {/* Shutter Flash Effect */}
            {showShutter && <div className="absolute inset-0 z-[100] bg-white animate-out fade-out duration-150"></div>}

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

            {/* AR Overlays (Translations) - INTERACTIVE WITH TTS */}
            {mode === 'translate' && detections.length > 0 && (
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {detections.map((det) => {
                        const [ymin, xmin, ymax, xmax] = det.box;
                        const isPlaying = playingTtsId === det.id;
                        return (
                            <button 
                                key={det.id}
                                onClick={() => playTts(det)}
                                className={`absolute bg-white border-2 rounded-xl px-4 py-3 flex flex-col transition-all duration-700 shadow-2xl animate-in zoom-in-50 pointer-events-auto active:scale-95 group ${isPlaying ? 'border-primary ring-4 ring-primary/20' : 'border-intl-border hover:border-primary/50'}`}
                                style={{
                                    top: `${ymin / 10}%`,
                                    left: `${xmin / 10}%`,
                                    width: `${(xmax - xmin) / 10}%`,
                                    height: `${(ymax - ymin) / 10}%`,
                                    minWidth: '140px'
                                }}
                            >
                                <div className="flex justify-between items-start w-full mb-1">
                                    <span className="text-[8px] text-graphite/40 uppercase font-black tracking-widest truncate max-w-[80%]">{det.original}</span>
                                    <span className={`material-symbols-outlined text-[14px] font-bold ${isPlaying ? 'text-primary animate-pulse' : 'text-graphite/20 group-hover:text-primary transition-colors'}`}>
                                        {isPlaying ? 'graphic_eq' : 'volume_up'}
                                    </span>
                                </div>
                                <span className={`text-[14px] font-black leading-tight uppercase transition-colors ${isPlaying ? 'text-primary' : 'text-graphite'}`}>
                                    {det.translated}
                                </span>
                                {isPlaying && (
                                    <div className="absolute -top-1 -right-1 flex gap-1">
                                        <div className="size-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="size-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                                        <div className="size-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Header */}
            <header className="relative z-40 p-6 flex items-center justify-between bg-gradient-to-b from-white/90 to-transparent backdrop-blur-[1px]">
                <button 
                    onClick={onBack} 
                    className="size-12 rounded-2xl bg-white border-2 border-intl-border shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-graphite"
                >
                    <span className="material-symbols-outlined text-3xl font-bold">arrow_back</span>
                </button>
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border-2 border-primary/20 text-primary">
                        <span className={`size-2 rounded-full bg-primary ${isCapturing || isScanning ? 'animate-ping' : ''}`}></span>
                        <span className="text-[9px] font-black uppercase tracking-widest">{isCapturing ? 'Analysing...' : 'Neural Vision Active'}</span>
                    </div>
                </div>
            </header>

            {/* Viewfinder Area */}
            <div className="relative flex-1 flex items-center justify-center pointer-events-none">
                <div className={`size-72 border-2 border-white/20 rounded-[4rem] transition-all duration-1000 relative ${isCapturing ? 'scale-90 border-primary shadow-[0_0_100px_rgba(255,79,0,0.2)] bg-primary/5' : 'scale-100'}`}>
                    <div className="absolute -top-1 -left-1 size-16 border-t-4 border-l-4 border-primary rounded-tl-[3.5rem] shadow-sm"></div>
                    <div className="absolute -bottom-1 -right-1 size-16 border-b-4 border-r-4 border-primary rounded-br-[3.5rem] shadow-sm"></div>
                    
                    {isCapturing && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Manual Capture Button */}
            <div className="absolute bottom-[280px] left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-4">
                <button 
                    onClick={handleManualAnalysis}
                    disabled={isCapturing || isScanning}
                    className={`group size-20 rounded-full bg-white border-[6px] border-primary shadow-[0_0_30px_rgba(0,0,0,0.3)] flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 ${isCapturing ? 'animate-pulse' : 'hover:scale-110'}`}
                >
                    <div className="size-12 rounded-full border-2 border-primary/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-primary font-bold">photo_camera</span>
                    </div>
                </button>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white drop-shadow-lg bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">Neural Scan</span>
            </div>

            {/* Identification Results Panel */}
            {objectResult && (
                <div className="absolute bottom-[250px] inset-x-6 z-[70] bg-white border-2 border-primary rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-500 overflow-y-auto max-h-[50%]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-black text-graphite uppercase tracking-tight">{objectResult.name}</h3>
                        <button onClick={() => setObjectResult(null)} className="size-8 rounded-full bg-stellar border border-intl-border flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                    <p className="text-sm font-bold text-graphite/60 leading-relaxed mb-6 italic">
                        "{objectResult.description}"
                    </p>
                    <div className="space-y-3">
                        {objectResult.facts.map((fact, idx) => (
                            <div key={idx} className="flex gap-3 items-start p-3 bg-stellar rounded-2xl border border-intl-border">
                                <span className="material-symbols-outlined text-primary text-sm font-bold">verified</span>
                                <p className="text-[11px] font-black text-graphite leading-tight uppercase tracking-tight">{fact}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Mode & Language Controls */}
            <div className="relative z-40 p-8 bg-white border-t-4 border-primary/20 rounded-t-[3rem] shadow-[0_-20px_40px_rgba(0,0,0,0.2)] mt-auto">
                <div className="flex bg-stellar border-2 border-intl-border rounded-[2rem] p-1.5 mb-8 shadow-inner">
                    <button 
                        onClick={() => { setMode('identify'); setDetections([]); }} 
                        className={`flex-1 py-4 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'identify' ? 'bg-primary text-white shadow-xl scale-[1.02]' : 'text-graphite/40 hover:text-graphite hover:bg-white'}`}
                    >
                        Scanner / Identifier
                    </button>
                    <button 
                        onClick={() => { setMode('translate'); setObjectResult(null); }} 
                        className={`flex-1 py-4 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'translate' ? 'bg-primary text-white shadow-xl scale-[1.02]' : 'text-graphite/40 hover:text-graphite hover:bg-white'}`}
                    >
                        Traduire AR
                    </button>
                </div>
                
                {mode === 'translate' && (
                    <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar no-scrollbar mask-fade-edges">
                        {LANGUAGES.map(lang => (
                            <button 
                                key={lang.code} 
                                onClick={() => {
                                    setTargetLang(lang.code);
                                    setDetections([]); // Clear old translations when language changes
                                }} 
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
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .mask-fade-edges {
                    mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
                }
            `}</style>
        </div>
    );
};
