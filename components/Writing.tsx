
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

interface WritingProps {
    onOpenCanva?: (data: { type: 'text' | 'sketch', content: string | Stroke[] }) => void;
}

export const Writing: React.FC<WritingProps> = ({ onOpenCanva }) => {
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
    const [redoStrokes, setRedoStrokes] = useState<Stroke[]>([]);
    const currentStroke = useRef<Point[]>([]);
    const isDrawing = useRef(false);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialisation et redimensionnement du canvas
    useEffect(() => {
        if (mode === 'sketch' && canvasRef.current && containerRef.current) {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            redrawCanvas();
        }
    }, [mode]);

    // Keyboard Shortcuts for Undo/Redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (mode !== 'sketch') return;
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) handleRedo(); else handleUndo();
                e.preventDefault();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                handleRedo();
                e.preventDefault();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mode, strokes, redoStrokes]);

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
            for (let i = 1; i < stroke.points.length; i++) ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            ctx.stroke();
        });
    };

    useEffect(() => { if (mode === 'sketch') redrawCanvas(); }, [strokes]);

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
            const newStroke = { color: brushColor, points: currentStroke.current };
            setStrokes(prev => [...prev, newStroke]);
            setRedoStrokes([]);
        }
        currentStroke.current = [];
    };

    const handleUndo = () => {
        if (strokes.length === 0) return;
        setStrokes(prev => {
            const lastStroke = prev[prev.length - 1];
            setRedoStrokes(redo => [...redo, lastStroke]);
            return prev.slice(0, -1);
        });
    };

    const handleRedo = () => {
        if (redoStrokes.length === 0) return;
        setRedoStrokes(prev => {
            const lastRedo = prev[prev.length - 1];
            setStrokes(st => [...st, lastRedo]);
            return prev.slice(0, -1);
        });
    };

    const clearCanvas = () => {
        if (confirm("Effacer tout le dessin ?")) {
            setStrokes([]);
            setRedoStrokes([]);
            redrawCanvas();
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
            link.download = `${filenameBase}.${exportFormat}`;
            link.href = canvasRef.current.toDataURL('image/png');
            link.click();
        }
    };

    const handleShare = async () => {
        setShowStatus('share');
        setTimeout(() => setShowStatus(null), 2000);
    };

    const handleOpenInCanva = () => {
        if (!onOpenCanva) return;
        if (mode === 'text') {
            onOpenCanva({ type: 'text', content: content });
        } else {
            onOpenCanva({ type: 'sketch', content: strokes });
        }
    };

    const handleAIAction = async (promptType: 'continue' | 'polish' | 'summarize' | 'expand') => {
        if (!content && promptType !== 'continue') return;
        setIsProcessing(true);
        setLastAction(promptType);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            let prompt = `Action: ${promptType}. Texte: ${content}`;
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
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
            <header className="px-6 py-4 flex items-center justify-between border-b-2 border-intl-border bg-white sticky top-0 z-30 shadow-sm">
                <div className="flex flex-col gap-1">
                    <input 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-transparent border-none p-0 text-lg font-black focus:ring-0 text-graphite tracking-tight uppercase"
                    />
                    <div className="flex gap-4 mt-1">
                        <button onClick={() => setMode('text')} className={`text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'text' ? 'text-primary scale-110' : 'text-graphite/40 hover:text-graphite'}`}>Text</button>
                        <button onClick={() => setMode('sketch')} className={`text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'sketch' ? 'text-purple-600 scale-110' : 'text-graphite/40 hover:text-graphite'}`}>Sketch</button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleOpenInCanva}
                        className="size-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all group"
                        title="Canva Studio"
                    >
                        <span className="material-symbols-outlined font-black">brush</span>
                    </button>
                    {mode === 'sketch' && (
                        <div className="flex bg-stellar border-2 border-intl-border rounded-xl p-1 gap-1">
                            <button onClick={handleUndo} disabled={strokes.length === 0} className="size-9 rounded-lg bg-white border border-intl-border flex items-center justify-center hover:bg-stellar disabled:opacity-20 text-graphite transition-all shadow-sm"><span className="material-symbols-outlined text-[20px] font-bold">undo</span></button>
                            <button onClick={handleRedo} disabled={redoStrokes.length === 0} className="size-9 rounded-lg bg-white border border-intl-border flex items-center justify-center hover:bg-stellar disabled:opacity-20 text-graphite transition-all shadow-sm"><span className="material-symbols-outlined text-[20px] font-bold">redo</span></button>
                            <button onClick={clearCanvas} className="size-9 rounded-lg bg-white border border-intl-border flex items-center justify-center hover:bg-red-50 text-red-500 transition-all shadow-sm"><span className="material-symbols-outlined text-[20px] font-bold">delete</span></button>
                        </div>
                    )}
                    <button onClick={handleDownload} className={`size-11 rounded-xl border-2 transition-all flex items-center justify-center shadow-sm ${showStatus === 'download' ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-intl-border text-graphite'}`}><span className="material-symbols-outlined font-bold">download</span></button>
                </div>
            </header>

            <div ref={containerRef} className="flex-1 relative overflow-hidden bg-white">
                {mode === 'text' ? (
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Exprimez vos idées ici..." className="w-full h-full bg-transparent border-none focus:ring-0 p-8 text-lg leading-relaxed text-graphite font-bold resize-none placeholder:text-graphite/10" />
                ) : (
                    <div className="w-full h-full relative touch-none">
                        <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="w-full h-full block cursor-crosshair" />
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 p-4 bg-white/80 backdrop-blur-md border-2 border-intl-border rounded-[2.5rem] shadow-2xl z-20">
                            {['#FF4F00', '#2563eb', '#7c3aed', '#10b981', '#1C1C1E'].map(color => (
                                <button key={color} onClick={() => setBrushColor(color)} className={`size-8 rounded-full border-2 transition-all ${brushColor === color ? 'scale-125 border-white ring-4 ring-primary/20 shadow-lg' : 'border-intl-border hover:scale-110'}`} style={{ backgroundColor: color }} />
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

            <footer className="p-5 bg-white border-t-2 border-intl-border pb-10">
                <div className="max-w-md mx-auto grid grid-cols-5 gap-3">
                    {mode === 'text' ? (
                        <>
                            <button onClick={() => handleAIAction('continue')} className="flex flex-col items-center gap-2 group"><div className="size-12 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm"><span className="material-symbols-outlined text-primary font-bold group-hover:text-white">fast_forward</span></div><span className="text-[9px] font-black uppercase tracking-widest text-primary">Suite</span></button>
                            <button onClick={() => handleAIAction('polish')} className="flex flex-col items-center gap-2 group"><div className="size-12 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm"><span className="material-symbols-outlined text-amber-600 font-bold group-hover:text-white">magic_button</span></div><span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Sublime</span></button>
                            <button onClick={() => handleAIAction('expand')} className="flex flex-col items-center gap-2 group"><div className="size-12 rounded-2xl bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm"><span className="material-symbols-outlined text-emerald-600 font-bold group-hover:text-white">add_task</span></div><span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Étoffer</span></button>
                            <button onClick={() => handleAIAction('summarize')} className="flex flex-col items-center gap-2 group"><div className="size-12 rounded-2xl bg-blue-50 border-2 border-blue-300 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"><span className="material-symbols-outlined text-blue-600 font-bold group-hover:text-white">short_text</span></div><span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Résumé</span></button>
                        </>
                    ) : (
                        <div className="col-span-4 flex gap-3">
                            <button onClick={handleOpenInCanva} className="flex-1 h-12 bg-graphite text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"><span className="material-symbols-outlined text-lg">brush</span> Vers Canva Pro</button>
                        </div>
                    )}
                    <button onClick={() => setMode(mode === 'text' ? 'sketch' : 'text')} className="flex flex-col items-center gap-2 group"><div className={`size-12 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-105 ${mode === 'sketch' ? 'bg-primary border-2 border-primary text-white scale-110 rotate-12' : 'bg-graphite border-2 border-graphite text-white'}`}><span className="material-symbols-outlined font-bold">{mode === 'sketch' ? 'edit_square' : 'brush'}</span></div><span className="text-[9px] font-black uppercase tracking-widest text-graphite">{mode === 'sketch' ? 'Éditer' : 'Dessiner'}</span></button>
                </div>
            </footer>
        </div>
    );
};
