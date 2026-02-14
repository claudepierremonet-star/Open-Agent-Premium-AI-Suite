
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

interface Point {
    x: number;
    y: number;
}

interface Stroke {
    color: string;
    points: Point[];
}

export const Writing: React.FC = () => {
    const [mode, setMode] = useState<'text' | 'sketch'>('text');
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('Nouveau Concept');
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastAction, setLastAction] = useState<string | null>(null);
    const [brushColor, setBrushColor] = useState('#FF4F00');
    const [showStatus, setShowStatus] = useState<'download' | 'share' | null>(null);
    
    const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'svg'>('png');
    const [jpgQuality, setJpgQuality] = useState(0.8);
    const [showExportOptions, setShowExportOptions] = useState(false);

    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const currentStroke = useRef<Point[]>([]);
    const isDrawing = useRef(false);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialisation et redimensionnement du canvas
    useEffect(() => {
        if (mode === 'sketch' && canvasRef.current && containerRef.current) {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            
            // On ajuste la résolution interne au format d'affichage pour éviter les décalages
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            
            redrawCanvas();
        }
    }, [mode]);

    const redrawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 5;

        strokes.forEach(stroke => {
            if (stroke.points.length < 2) return;
            ctx.strokeStyle = stroke.color;
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
        });
    };

    // Redessiner quand l'historique change
    useEffect(() => {
        if (mode === 'sketch') redrawCanvas();
    }, [strokes]);

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }

        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        // Désactiver le défilement pendant le dessin sur mobile
        if (e.cancelable) e.preventDefault();
        
        isDrawing.current = true;
        const coord = getCoordinates(e);
        if (coord) {
            currentStroke.current = [coord];
            
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = brushColor;
                ctx.lineWidth = 5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(coord.x, coord.y);
            }
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current) return;
        if (e.cancelable) e.preventDefault();

        const coord = getCoordinates(e);
        const ctx = canvasRef.current?.getContext('2d');
        
        if (coord && ctx) {
            ctx.lineTo(coord.x, coord.y);
            ctx.stroke();
            currentStroke.current.push(coord);
        }
    };

    const stopDrawing = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        
        if (currentStroke.current.length > 1) {
            setStrokes(prev => [...prev, { color: brushColor, points: currentStroke.current }]);
        }
        currentStroke.current = [];
    };

    const clearCanvas = () => {
        if (confirm("Effacer tout le dessin ?")) {
            setStrokes([]);
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

    const handleDownload = () => {
        setShowStatus('download');
        setTimeout(() => setShowStatus(null), 2000);

        const filenameBase = title.replace(/\s+/g, '_');

        if (mode === 'text') {
            const element = document.createElement("a");
            const file = new Blob([`TITRE: ${title}\n\n${content}`], {type: 'text/plain'});
            element.href = URL.createObjectURL(file);
            element.download = `${filenameBase}.txt`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        } else if (canvasRef.current) {
            const link = document.createElement('a');
            const mimeType = exportFormat === 'jpg' ? 'image/jpeg' : 'image/png';
            link.download = `${filenameBase}.${exportFormat === 'svg' ? 'png' : exportFormat}`;
            link.href = canvasRef.current.toDataURL(mimeType, exportFormat === 'jpg' ? jpgQuality : undefined);
            link.click();
        }
        setShowExportOptions(false);
    };

    const handleShare = async () => {
        const currentUrl = window.location.href;
        const isValidUrl = currentUrl.startsWith('http');
        
        const shareData: ShareData = {
            title: title,
            text: mode === 'text' ? content : `Concept visuel Premium AI Suite : ${title}`,
        };

        if (isValidUrl) shareData.url = currentUrl;

        try {
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
                setShowStatus('share');
            } else {
                const fallbackText = `${title}\n\n${mode === 'text' ? content : 'Croquis Premium AI Suite'}`;
                await navigator.clipboard.writeText(fallbackText);
                setShowStatus('share');
            }
        } catch (err) {
            console.error("Share failed:", err);
        }
        setTimeout(() => setShowStatus(null), 2000);
    };

    const handleSketchToAI = async (target: 'photo' | 'video' | 'description') => {
        if (!canvasRef.current || strokes.length === 0) return;
        setIsProcessing(true);
        setLastAction(`Transmutation en ${target}...`);

        try {
            const canvas = canvasRef.current;
            const base64Image = canvas.toDataURL('image/png').split(',')[1];
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const analysis = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [
                    {
                        parts: [
                            { inlineData: { data: base64Image, mimeType: 'image/png' } },
                            { text: "Analyse ce croquis. Décris-le de manière extrêmement détaillée pour un moteur de rendu professionnel. Inclus le style, les couleurs, l'émotion et la composition. Réponds uniquement avec le prompt descriptif." }
                        ]
                    }
                ]
            });

            const refinedPrompt = analysis.text;

            if (target === 'photo') {
                const imgResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: [{ parts: [{ text: refinedPrompt }] }],
                });
                const imgPart = imgResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
                if (imgPart) {
                    const link = document.createElement('a');
                    link.download = `photo_generee.png`;
                    link.href = `data:image/png;base64,${imgPart.inlineData.data}`;
                    link.click();
                }
            } else if (target === 'video') {
                alert("Génération vidéo via Veo 3.1 en cours...");
            } else {
                setContent(prev => prev + "\n\n[Analyse IA] :\n" + refinedPrompt);
                setMode('text');
            }
        } catch (error) {
            console.error("Transmute Error:", error);
        } finally {
            setIsProcessing(false);
            setLastAction(null);
        }
    };

    const handleAIAction = async (promptType: 'continue' | 'polish' | 'summarize' | 'expand') => {
        if (!content && promptType !== 'continue') return;
        setIsProcessing(true);
        setLastAction(promptType);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            let prompt = `Action: ${promptType}. Texte: ${content}`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            setContent(response.text || content);
        } catch (error) {
            console.error("Erreur IA Writing:", error);
        } finally {
            setIsProcessing(false);
            setLastAction(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-stellar relative select-none">
            {/* Header Haute Visibilité */}
            <header className="px-6 py-4 flex items-center justify-between border-b-2 border-intl-border bg-white sticky top-0 z-30 shadow-sm">
                <div className="flex flex-col gap-1">
                    <input 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-transparent border-none p-0 text-lg font-black focus:ring-0 text-graphite tracking-tight uppercase"
                    />
                    <div className="flex gap-4 mt-1">
                        <button 
                            onClick={() => setMode('text')}
                            className={`text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'text' ? 'text-primary scale-110' : 'text-graphite/40 hover:text-graphite'}`}
                        >Text</button>
                        <button 
                            onClick={() => setMode('sketch')}
                            className={`text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'sketch' ? 'text-purple-600 scale-110' : 'text-graphite/40 hover:text-graphite'}`}
                        >Sketch</button>
                    </div>
                </div>
                <div className="flex gap-2">
                    {mode === 'sketch' && (
                        <button onClick={clearCanvas} className="size-11 rounded-xl bg-white border-2 border-intl-border flex items-center justify-center hover:bg-red-50 text-red-500 hover:border-red-200 transition-all shadow-sm">
                            <span className="material-symbols-outlined font-bold">delete</span>
                        </button>
                    )}
                    <button 
                        onClick={() => mode === 'sketch' ? setShowExportOptions(!showExportOptions) : handleDownload()}
                        className={`size-11 rounded-xl border-2 transition-all flex items-center justify-center shadow-sm ${showStatus === 'download' ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-intl-border text-graphite'}`}
                    >
                        <span className="material-symbols-outlined font-bold">{showStatus === 'download' ? 'check' : 'download'}</span>
                    </button>
                    <button 
                        onClick={handleShare}
                        className={`size-11 rounded-xl border-2 transition-all flex items-center justify-center shadow-sm ${showStatus === 'share' ? 'bg-primary border-primary text-white' : 'bg-white border-intl-border text-graphite'}`}
                    >
                        <span className="material-symbols-outlined font-bold">{showStatus === 'share' ? 'done_all' : 'share'}</span>
                    </button>
                </div>
            </header>

            {/* Zone d'édition / Dessin */}
            <div ref={containerRef} className="flex-1 relative overflow-hidden bg-white">
                {mode === 'text' ? (
                    <textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Exprimez vos idées ici..."
                        className="w-full h-full bg-transparent border-none focus:ring-0 p-8 text-lg leading-relaxed text-graphite font-bold resize-none placeholder:text-graphite/10"
                    />
                ) : (
                    <div className="w-full h-full relative touch-none">
                        <canvas 
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="w-full h-full block cursor-crosshair"
                        />
                        {/* Palette de couleurs */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 p-4 bg-white border-2 border-intl-border rounded-[2.5rem] shadow-2xl z-20">
                            {['#FF4F00', '#2563eb', '#7c3aed', '#10b981', '#1C1C1E'].map(color => (
                                <button 
                                    key={color}
                                    onClick={() => setBrushColor(color)}
                                    className={`size-8 rounded-full border-2 transition-all ${brushColor === color ? 'scale-125 border-white ring-4 ring-primary/20' : 'border-intl-border hover:scale-110'}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                )}
                
                {isProcessing && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-40 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-6 animate-in zoom-in-95">
                            <div className="size-20 border-8 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary animate-pulse">{lastAction}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Toolbar Basse */}
            <footer className="p-5 bg-white border-t-2 border-intl-border pb-10">
                <div className="max-w-md mx-auto grid grid-cols-5 gap-3">
                    {mode === 'text' ? (
                        <>
                            <button onClick={() => handleAIAction('continue')} className="flex flex-col items-center gap-2 group">
                                <div className="size-12 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                    <span className="material-symbols-outlined text-primary font-bold group-hover:text-white">fast_forward</span>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary">Suite</span>
                            </button>
                            <button onClick={() => handleAIAction('polish')} className="flex flex-col items-center gap-2 group">
                                <div className="size-12 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
                                    <span className="material-symbols-outlined text-amber-600 font-bold group-hover:text-white">magic_button</span>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Sublime</span>
                            </button>
                            <button onClick={() => handleAIAction('expand')} className="flex flex-col items-center gap-2 group">
                                <div className="size-12 rounded-2xl bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                                    <span className="material-symbols-outlined text-emerald-600 font-bold group-hover:text-white">add_task</span>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Étoffer</span>
                            </button>
                            <button onClick={() => handleAIAction('summarize')} className="flex flex-col items-center gap-2 group">
                                <div className="size-12 rounded-2xl bg-blue-50 border-2 border-blue-300 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                    <span className="material-symbols-outlined text-blue-600 font-bold group-hover:text-white">short_text</span>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Résumé</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => handleSketchToAI('photo')} className="flex flex-col items-center gap-2 group">
                                <div className="size-12 rounded-2xl bg-blue-50 border-2 border-blue-300 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all shadow-md">
                                    <span className="material-symbols-outlined text-blue-600 font-bold group-hover:text-white">image</span>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Photo</span>
                            </button>
                            <button onClick={() => handleSketchToAI('video')} className="flex flex-col items-center gap-2 group">
                                <div className="size-12 rounded-2xl bg-rose-50 border-2 border-rose-300 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all shadow-md">
                                    <span className="material-symbols-outlined text-rose-500 font-bold group-hover:text-white">movie</span>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">Video</span>
                            </button>
                            <button onClick={() => handleSketchToAI('description')} className="flex flex-col items-center gap-2 group">
                                <div className="size-12 rounded-2xl bg-purple-50 border-2 border-purple-300 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shadow-md">
                                    <span className="material-symbols-outlined text-purple-600 font-bold group-hover:text-white">description</span>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-purple-600">Analyse</span>
                            </button>
                            <button onClick={handleShare} className="flex flex-col items-center gap-2 group">
                                <div className="size-12 rounded-2xl bg-stellar border-2 border-intl-border flex items-center justify-center group-hover:bg-graphite group-hover:text-white transition-all">
                                    <span className="material-symbols-outlined text-graphite font-bold group-hover:text-white">share</span>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-graphite">Share</span>
                            </button>
                        </>
                    )}
                    <button onClick={() => setMode(mode === 'text' ? 'sketch' : 'text')} className="flex flex-col items-center gap-2 group">
                        <div className={`size-12 rounded-2xl flex items-center justify-center transition-all shadow-xl ${mode === 'sketch' ? 'bg-primary border-2 border-primary text-white scale-110 rotate-12' : 'bg-graphite border-2 border-graphite text-white'}`}>
                            <span className="material-symbols-outlined font-bold">{mode === 'sketch' ? 'edit_square' : 'brush'}</span>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-graphite">{mode === 'sketch' ? 'Éditer' : 'Dessiner'}</span>
                    </button>
                </div>
            </footer>
        </div>
    );
};
