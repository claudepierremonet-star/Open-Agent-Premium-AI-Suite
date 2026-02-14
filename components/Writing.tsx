
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
    const [brushColor, setBrushColor] = useState('#2957ff');
    const [showStatus, setShowStatus] = useState<'download' | 'share' | null>(null);
    
    // Export Settings
    const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'svg'>('png');
    const [jpgQuality, setJpgQuality] = useState(0.8);
    const [showExportOptions, setShowExportOptions] = useState(false);

    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const currentStroke = useRef<Point[]>([]);
    
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);

    // Initialisation and Redrawing Canvas
    useEffect(() => {
        if (mode === 'sketch' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineWidth = 3;
                
                // Clear and redraw all strokes
                ctx.clearRect(0, 0, canvas.width, canvas.height);
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
            }
        }
    }, [mode, strokes, brushColor]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        isDrawing.current = true;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
        
        currentStroke.current = [{ x, y }];
    };

    const stopDrawing = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        
        if (currentStroke.current.length > 0) {
            setStrokes(prev => [...prev, { color: brushColor, points: currentStroke.current }]);
        }
        currentStroke.current = [];
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

        const newPoint = { x, y };
        const lastPoint = currentStroke.current[currentStroke.current.length - 1];

        if (lastPoint) {
            ctx.strokeStyle = brushColor;
            ctx.beginPath();
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(newPoint.x, newPoint.y);
            ctx.stroke();
        }

        currentStroke.current.push(newPoint);
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

    const generateSVG = () => {
        if (!canvasRef.current) return "";
        const { width, height } = canvasRef.current;
        let svgPaths = strokes.map(stroke => {
            if (stroke.points.length < 2) return "";
            const d = `M ${stroke.points[0].x} ${stroke.points[0].y} ` + 
                      stroke.points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
            return `<path d="${d}" stroke="${stroke.color}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
        }).join("\n");

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background:transparent;">
            ${svgPaths}
        </svg>`;
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
            
            if (exportFormat === 'svg') {
                const svgContent = generateSVG();
                const blob = new Blob([svgContent], { type: 'image/svg+xml' });
                link.href = URL.createObjectURL(blob);
                link.download = `${filenameBase}.svg`;
            } else {
                const mimeType = exportFormat === 'jpg' ? 'image/jpeg' : 'image/png';
                link.download = `${filenameBase}.${exportFormat}`;
                link.href = canvasRef.current.toDataURL(mimeType, exportFormat === 'jpg' ? jpgQuality : undefined);
            }
            link.click();
        }
        setShowExportOptions(false);
    };

    const handleShare = async () => {
        const shareData = {
            title: title,
            text: mode === 'text' ? content : `Regarde mon croquis Open Agent : ${title}`,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                setShowStatus('share');
            } else {
                await navigator.clipboard.writeText(`${title}\n\n${content}`);
                setShowStatus('share');
            }
        } catch (err) {
            console.error("Share failed:", err);
        }
        setTimeout(() => setShowStatus(null), 2000);
    };

    const handleSketchToAI = async (target: 'photo' | 'video' | 'description') => {
        if (!canvasRef.current) return;
        setIsProcessing(true);
        setLastAction(`Transmuting Sketch to ${target}...`);

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
                    link.download = `photo_from_sketch.png`;
                    link.href = `data:image/png;base64,${imgPart.inlineData.data}`;
                    link.click();
                }
            } else if (target === 'video') {
                alert("Lancement de la génération vidéo Veo basée sur votre croquis...");
            } else {
                setContent(prev => prev + "\n\n[Analyse du dessin] :\n" + refinedPrompt);
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
        <div className="flex flex-col h-full bg-background-dark relative">
            {/* Header avec Switcher et Actions Export */}
            <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 glass sticky top-0 z-30">
                <div className="flex flex-col">
                    <input 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 text-white/90"
                    />
                    <div className="flex gap-4 mt-2">
                        <button 
                            onClick={() => setMode('text')}
                            className={`text-[10px] font-black uppercase tracking-widest transition-colors ${mode === 'text' ? 'text-primary' : 'text-white/20'}`}
                        >Text</button>
                        <button 
                            onClick={() => setMode('sketch')}
                            className={`text-[10px] font-black uppercase tracking-widest transition-colors ${mode === 'sketch' ? 'text-purple-400' : 'text-white/20'}`}
                        >Sketch</button>
                    </div>
                </div>
                <div className="flex gap-2">
                    {mode === 'sketch' && (
                        <button onClick={clearCanvas} className="size-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    )}
                    <button 
                        onClick={() => mode === 'sketch' ? setShowExportOptions(!showExportOptions) : handleDownload()}
                        className={`size-9 rounded-lg border transition-all flex items-center justify-center ${showStatus === 'download' ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">{showStatus === 'download' ? 'check' : 'download'}</span>
                    </button>
                    <button 
                        onClick={handleShare}
                        className={`size-9 rounded-lg border transition-all flex items-center justify-center ${showStatus === 'share' ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70'}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">{showStatus === 'share' ? 'done_all' : 'share'}</span>
                    </button>
                </div>
            </header>

            {/* Export Options Overlay (Sketch Mode Only) */}
            {mode === 'sketch' && showExportOptions && (
                <div className="absolute top-20 right-6 z-50 w-64 p-5 bg-background-dark/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-3xl animate-in zoom-in-95 fade-in duration-200">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Paramètres d'export</h4>
                        <button onClick={() => setShowExportOptions(false)} className="material-symbols-outlined text-sm opacity-50">close</button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Format</label>
                            <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 rounded-lg border border-white/5">
                                {['png', 'jpg', 'svg'].map(fmt => (
                                    <button 
                                        key={fmt}
                                        onClick={() => setExportFormat(fmt as any)}
                                        className={`py-1 text-[9px] font-black rounded uppercase transition-all ${exportFormat === fmt ? 'bg-primary text-white' : 'text-white/20'}`}
                                    >
                                        {fmt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {exportFormat === 'jpg' && (
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Qualité</label>
                                    <span className="text-[9px] font-mono text-primary">{Math.round(jpgQuality * 100)}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0.1" 
                                    max="1.0" 
                                    step="0.05"
                                    value={jpgQuality}
                                    onChange={(e) => setJpgQuality(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-white/10 rounded-full appearance-none accent-primary cursor-pointer"
                                />
                            </div>
                        )}

                        <button 
                            onClick={handleDownload}
                            className="w-full py-2 bg-primary rounded-xl text-[10px] font-black uppercase tracking-widest shadow-neon active:scale-95 transition-all"
                        >
                            Confirmer & Télécharger
                        </button>
                    </div>
                </div>
            )}

            {/* Zone d'édition dynamique */}
            <div className="flex-1 relative overflow-hidden">
                {mode === 'text' ? (
                    <textarea 
                        ref={textAreaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Écrivez ou changez en mode 'Sketch' pour dessiner vos idées..."
                        className="w-full h-full bg-transparent border-none focus:ring-0 p-8 text-[16px] leading-relaxed text-white/80 resize-none custom-scrollbar"
                    />
                ) : (
                    <div className="w-full h-full relative cursor-crosshair touch-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-fixed">
                        <canvas 
                            ref={canvasRef}
                            width={window.innerWidth > 450 ? 450 : window.innerWidth}
                            height={800}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="w-full h-full"
                        />
                        {/* Floating Sketch Palette */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-20">
                            {['#2957ff', '#a855f7', '#ec4899', '#f59e0b', '#ffffff'].map(color => (
                                <button 
                                    key={color}
                                    onClick={() => setBrushColor(color)}
                                    className={`size-6 rounded-full border-2 transition-transform ${brushColor === color ? 'border-white scale-125 shadow-lg' : 'border-transparent scale-100'}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                )}
                
                {isProcessing && (
                    <div className="absolute inset-0 bg-background-dark/60 backdrop-blur-md z-40 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4 animate-in zoom-in-95">
                            <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">{lastAction}</p>
                        </div>
                    </div>
                )}

                {/* Status Toasts Localized */}
                {showStatus && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4">
                        <div className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-2xl backdrop-blur-xl ${showStatus === 'download' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                            {showStatus === 'download' ? 'Fichier exporté' : 'Partagé / Copié'}
                        </div>
                    </div>
                )}
            </div>

            {/* Toolbar Multimodale */}
            <footer className="p-4 bg-background-dark border-t border-white/5 pb-8">
                <div className="max-w-md mx-auto grid grid-cols-5 gap-2">
                    {mode === 'text' ? (
                        <>
                            <button onClick={() => handleAIAction('continue')} className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center"><span className="material-symbols-outlined text-primary">fast_forward</span></div>
                                <span className="text-[8px] font-bold uppercase">Suite</span>
                            </button>
                            <button onClick={() => handleAIAction('polish')} className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center"><span className="material-symbols-outlined text-amber-500">magic_button</span></div>
                                <span className="text-[8px] font-bold uppercase">Sublimer</span>
                            </button>
                            <button onClick={() => handleAIAction('expand')} className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center"><span className="material-symbols-outlined text-emerald-500">add_task</span></div>
                                <span className="text-[8px] font-bold uppercase">Étoffer</span>
                            </button>
                            <button onClick={() => handleAIAction('summarize')} className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center"><span className="material-symbols-outlined text-purple-500">short_text</span></div>
                                <span className="text-[8px] font-bold uppercase">Résumer</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => handleSketchToAI('photo')} className="flex flex-col items-center gap-1 group">
                                <div className="size-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center group-hover:bg-blue-500/40 transition-all shadow-neon">
                                    <span className="material-symbols-outlined text-blue-400">image</span>
                                </div>
                                <span className="text-[8px] font-bold uppercase text-blue-400">To Photo</span>
                            </button>
                            <button onClick={() => handleSketchToAI('video')} className="flex flex-col items-center gap-1 group">
                                <div className="size-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center group-hover:bg-rose-500/40 transition-all shadow-lg">
                                    <span className="material-symbols-outlined text-rose-400">movie</span>
                                </div>
                                <span className="text-[8px] font-bold uppercase text-rose-400">To Video</span>
                            </button>
                            <button onClick={() => handleSketchToAI('description')} className="flex flex-col items-center gap-1 group">
                                <div className="size-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center group-hover:bg-purple-500/40 transition-all">
                                    <span className="material-symbols-outlined text-purple-400">description</span>
                                </div>
                                <span className="text-[8px] font-bold uppercase text-purple-400">To Text</span>
                            </button>
                            <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
                                <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                                    <span className="material-symbols-outlined text-white">share</span>
                                </div>
                                <span className="text-[8px] font-bold uppercase text-white">Share Log</span>
                            </button>
                        </>
                    )}
                    <button onClick={() => setMode(mode === 'text' ? 'sketch' : 'text')} className="flex flex-col items-center gap-1">
                        <div className={`size-10 rounded-xl flex items-center justify-center transition-all ${mode === 'sketch' ? 'bg-primary shadow-neon text-white' : 'bg-white/5 text-white/40'}`}>
                            <span className="material-symbols-outlined">{mode === 'sketch' ? 'edit_square' : 'brush'}</span>
                        </div>
                        <span className="text-[8px] font-bold uppercase">{mode === 'sketch' ? 'Éditer' : 'Dessiner'}</span>
                    </button>
                </div>
            </footer>
        </div>
    );
};
