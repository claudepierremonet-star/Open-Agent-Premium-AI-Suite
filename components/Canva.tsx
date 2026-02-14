
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

interface CanvasElement {
    id: string;
    type: 'text' | 'image' | 'shape' | 'sketch';
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize?: number;
    color?: string;
    fontFamily?: string;
    rotation?: number;
    opacity?: number;
    zIndex: number;
    data?: any;
}

interface CanvaProps {
    initialData?: { type: 'text' | 'sketch', content: string | any[] };
    onBack: () => void;
}

export const Canva: React.FC<CanvaProps> = ({ initialData, onBack }) => {
    const [elements, setElements] = useState<CanvasElement[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [canvasBg, setCanvasBg] = useState('#1C1C1E');
    const [bgTexture, setBgTexture] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // UI State
    const [activeSidebar, setActiveSidebar] = useState<'text' | 'assets' | 'layers' | null>(null);
    const [showExportPanel, setShowExportPanel] = useState(false);
    const [exportFormat, setExportFormat] = useState<'png' | 'jpg'>('png');
    const [exportScale, setExportScale] = useState(2);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (initialData) {
            if (initialData.type === 'text' && typeof initialData.content === 'string') {
                addText(initialData.content);
            } else if (initialData.type === 'sketch' && Array.isArray(initialData.content)) {
                addSketch(initialData.content);
            }
        }
    }, [initialData]);

    const getNextZIndex = () => {
        if (elements.length === 0) return 1;
        return Math.max(...elements.map(e => e.zIndex)) + 1;
    };

    const addText = (text: string = "INSTRUCTION NEURALE") => {
        const newEl: CanvasElement = {
            id: Date.now().toString(),
            type: 'text',
            content: text,
            x: 40,
            y: 100,
            width: 300,
            height: 80,
            fontSize: 32,
            color: '#FFFFFF',
            fontFamily: 'Inter',
            rotation: 0,
            opacity: 1,
            zIndex: getNextZIndex()
        };
        setElements(prev => [...prev, newEl]);
        setSelectedId(newEl.id);
        setActiveSidebar(null);
    };

    const addShape = (shapeType: string) => {
        const newEl: CanvasElement = {
            id: Date.now().toString(),
            type: 'shape',
            content: shapeType,
            x: 100,
            y: 200,
            width: 150,
            height: 150,
            color: '#FF4F00',
            rotation: 0,
            opacity: 0.8,
            zIndex: getNextZIndex()
        };
        setElements(prev => [...prev, newEl]);
        setSelectedId(newEl.id);
    };

    const addSketch = (strokes: any[]) => {
        const newEl: CanvasElement = {
            id: Date.now().toString(),
            type: 'sketch',
            content: 'Sketch Layer',
            x: 20,
            y: 20,
            width: 340,
            height: 500,
            data: strokes,
            rotation: 0,
            opacity: 1,
            zIndex: getNextZIndex()
        };
        setElements(prev => [...prev, newEl]);
        setSelectedId(newEl.id);
    };

    const handleElementDrag = (id: string, e: React.MouseEvent | React.TouchEvent) => {
        const el = elements.find(item => item.id === id);
        if (!el) return;
        
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        
        const startX = clientX;
        const startY = clientY;
        const origX = el.x;
        const origY = el.y;

        const onMove = (moveEvent: MouseEvent | TouchEvent) => {
            const curX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const curY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
            
            const dx = curX - startX;
            const dy = curY - startY;

            setElements(prev => prev.map(item => 
                item.id === id ? { ...item, x: origX + dx, y: origY + dy } : item
            ));
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove);
        window.addEventListener('touchend', onUp);
    };

    const bringToFront = () => {
        if (!selectedId) return;
        setElements(prev => prev.map(e => e.id === selectedId ? { ...e, zIndex: getNextZIndex() } : e));
    };

    const sendToBack = () => {
        if (!selectedId) return;
        const minZ = Math.min(...elements.map(e => e.zIndex));
        setElements(prev => prev.map(e => e.id === selectedId ? { ...e, zIndex: minZ - 1 } : e));
    };

    const handleExport = async () => {
        setIsExporting(true);
        const canvas = document.createElement('canvas');
        canvas.width = 380 * exportScale;
        canvas.height = 540 * exportScale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = canvasBg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

        for (const el of sorted) {
            ctx.save();
            ctx.globalAlpha = el.opacity || 1;
            const centerX = (el.x + el.width / 2) * exportScale;
            const centerY = (el.y + el.height / 2) * exportScale;
            ctx.translate(centerX, centerY);
            ctx.rotate((el.rotation || 0) * Math.PI / 180);
            ctx.translate(-centerX, -centerY);

            if (el.type === 'text') {
                ctx.fillStyle = el.color || '#FFFFFF';
                const fontSize = (el.fontSize || 32) * exportScale;
                ctx.font = `900 ${fontSize}px Inter, sans-serif`;
                ctx.textBaseline = 'top';
                ctx.fillText(el.content, el.x * exportScale, el.y * exportScale);
            } else if (el.type === 'shape') {
                ctx.fillStyle = el.color || '#FF4F00';
                if (el.content === 'circle') {
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, (el.width / 2) * exportScale, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(el.x * exportScale, el.y * exportScale, el.width * exportScale, el.height * exportScale);
                }
            } else if (el.type === 'sketch' && el.data) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineWidth = 5 * exportScale;
                el.data.forEach((stroke: any) => {
                    if (stroke.points.length < 2) return;
                    ctx.strokeStyle = stroke.color;
                    ctx.beginPath();
                    ctx.moveTo((el.x + stroke.points[0].x) * exportScale, (el.y + stroke.points[0].y) * exportScale);
                    for (let i = 1; i < stroke.points.length; i++) {
                        ctx.lineTo((el.x + stroke.points[i].x) * exportScale, (el.y + stroke.points[i].y) * exportScale);
                    }
                    ctx.stroke();
                });
            }
            ctx.restore();
        }

        const link = document.createElement('a');
        link.download = `neural-design-${Date.now()}.${exportFormat}`;
        link.href = canvas.toDataURL(exportFormat === 'png' ? 'image/png' : 'image/jpeg');
        link.click();
        setIsExporting(false);
        setShowExportPanel(false);
    };

    const selectedElement = elements.find(e => e.id === selectedId);

    return (
        <div className="flex flex-col h-full bg-[#121214] relative overflow-hidden font-display">
            {/* Pro Header */}
            <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#121214]/80 backdrop-blur-2xl z-50">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all hover:bg-white/10">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <div>
                        <h1 className="text-sm font-black text-white uppercase tracking-tighter">Canva Studio <span className="text-primary">Pro</span></h1>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Neural Composition Engine</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowExportPanel(true)} className="px-5 h-10 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-sm">download</span>
                        Export
                    </button>
                </div>
            </header>

            <div className="flex-1 relative flex overflow-hidden">
                {/* Left Mini Sidebar */}
                <aside className="w-16 border-r border-white/5 flex flex-col items-center py-6 gap-6 bg-[#121214] z-40">
                    <button 
                        onClick={() => setActiveSidebar(activeSidebar === 'text' ? null : 'text')}
                        className={`size-10 rounded-xl flex items-center justify-center transition-all ${activeSidebar === 'text' ? 'bg-primary text-white shadow-lg' : 'text-white/30 hover:text-white'}`}
                    >
                        <span className="material-symbols-outlined">title</span>
                    </button>
                    <button 
                        onClick={() => setActiveSidebar(activeSidebar === 'assets' ? null : 'assets')}
                        className={`size-10 rounded-xl flex items-center justify-center transition-all ${activeSidebar === 'assets' ? 'bg-primary text-white shadow-lg' : 'text-white/30 hover:text-white'}`}
                    >
                        <span className="material-symbols-outlined">category</span>
                    </button>
                    <button 
                        onClick={() => setActiveSidebar(activeSidebar === 'layers' ? null : 'layers')}
                        className={`size-10 rounded-xl flex items-center justify-center transition-all ${activeSidebar === 'layers' ? 'bg-primary text-white shadow-lg' : 'text-white/30 hover:text-white'}`}
                    >
                        <span className="material-symbols-outlined">layers</span>
                    </button>
                    <div className="mt-auto">
                        <button onClick={() => setCanvasBg(canvasBg === '#1C1C1E' ? '#FBFBFB' : '#1C1C1E')} className="size-10 rounded-xl text-white/30 hover:text-white flex items-center justify-center">
                            <span className="material-symbols-outlined">palette</span>
                        </button>
                    </div>
                </aside>

                {/* Sub-Sidebar Panels */}
                {activeSidebar && (
                    <div className="w-64 bg-[#121214] border-r border-white/5 p-6 animate-in slide-in-from-left duration-300 z-30">
                        {activeSidebar === 'text' && (
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Ajouter du Texte</h3>
                                <button onClick={() => addText("TITRE PRINCIPAL")} className="w-full py-4 rounded-xl border-2 border-white/10 text-white font-black text-lg hover:border-primary transition-all">TITRE</button>
                                <button onClick={() => addText("Sous-titre neural")} className="w-full py-3 rounded-xl border-2 border-white/10 text-white font-bold text-sm hover:border-primary transition-all">Sous-titre</button>
                                <button onClick={() => addText("Corps de texte intelligent...")} className="w-full py-2 rounded-xl border-2 border-white/10 text-white text-xs hover:border-primary transition-all">Corps</button>
                            </div>
                        )}
                        {activeSidebar === 'assets' && (
                            <div className="space-y-6">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Neural Assets</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => addShape('square')} className="aspect-square rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:border-primary group transition-all">
                                        <div className="size-8 bg-white/20 group-hover:bg-primary/40 rounded-sm"></div>
                                    </button>
                                    <button onClick={() => addShape('circle')} className="aspect-square rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:border-primary group transition-all">
                                        <div className="size-8 bg-white/20 group-hover:bg-primary/40 rounded-full"></div>
                                    </button>
                                </div>
                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-2">Neural Stickers</p>
                                    <p className="text-[10px] text-white/40 italic">Coming soon: Instant SVG Generation from prompts.</p>
                                </div>
                            </div>
                        )}
                        {activeSidebar === 'layers' && (
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Calques</h3>
                                <div className="space-y-2">
                                    {[...elements].sort((a,b) => b.zIndex - a.zIndex).map(el => (
                                        <button 
                                            key={el.id} 
                                            onClick={() => setSelectedId(el.id)}
                                            className={`w-full p-3 rounded-xl flex items-center gap-3 border-2 transition-all ${selectedId === el.id ? 'bg-primary/10 border-primary text-white' : 'bg-white/5 border-transparent text-white/40'}`}
                                        >
                                            <span className="material-symbols-outlined text-sm">{el.type === 'text' ? 'title' : el.type === 'sketch' ? 'brush' : 'category'}</span>
                                            <span className="text-[10px] font-bold truncate flex-1 text-left">{el.content}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Main Viewport */}
                <div className="flex-1 relative flex items-center justify-center bg-[#0a0a0b] overflow-hidden">
                    {/* Visual Grid Background */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                    
                    <div 
                        ref={containerRef}
                        className="relative shadow-[0_60px_150px_rgba(0,0,0,0.9)] overflow-hidden rounded-[2px] cursor-default group"
                        style={{ 
                            width: '380px', 
                            height: '540px', 
                            backgroundColor: canvasBg,
                            backgroundImage: bgTexture ? `url(${bgTexture})` : 'none',
                            backgroundSize: 'cover'
                        }}
                        onClick={() => setSelectedId(null)}
                    >
                        {elements.map((el) => (
                            <div 
                                key={el.id}
                                onMouseDown={(e) => { e.stopPropagation(); setSelectedId(el.id); handleElementDrag(el.id, e); }}
                                onTouchStart={(e) => { e.stopPropagation(); setSelectedId(el.id); handleElementDrag(el.id, e); }}
                                className={`absolute cursor-move select-none group/el ${selectedId === el.id ? 'z-[100]' : ''}`}
                                style={{ 
                                    left: el.x, 
                                    top: el.y, 
                                    width: el.width, 
                                    height: el.height, 
                                    transform: `rotate(${el.rotation}deg)`,
                                    opacity: el.opacity,
                                    zIndex: el.zIndex
                                }}
                            >
                                {/* Active Selection Border */}
                                {selectedId === el.id && (
                                    <div className="absolute -inset-2 border-2 border-cyan-500 rounded-sm pointer-events-none">
                                        <div className="absolute -top-1.5 -left-1.5 size-3 bg-cyan-500 rounded-full border-2 border-white shadow-xl"></div>
                                        <div className="absolute -top-1.5 -right-1.5 size-3 bg-cyan-500 rounded-full border-2 border-white shadow-xl"></div>
                                        <div className="absolute -bottom-1.5 -left-1.5 size-3 bg-cyan-500 rounded-full border-2 border-white shadow-xl"></div>
                                        <div className="absolute -bottom-1.5 -right-1.5 size-3 bg-cyan-500 rounded-full border-2 border-white shadow-xl"></div>
                                    </div>
                                )}

                                {el.type === 'text' && (
                                    <div 
                                        style={{ 
                                            fontSize: el.fontSize, 
                                            color: el.color, 
                                            fontFamily: el.fontFamily,
                                            textShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                                        }} 
                                        className="font-black leading-[0.9] break-words p-1 outline-none"
                                        contentEditable={selectedId === el.id}
                                        suppressContentEditableWarning
                                        onBlur={(e) => setElements(prev => prev.map(item => item.id === el.id ? { ...item, content: e.target.innerText } : item))}
                                    >
                                        {el.content}
                                    </div>
                                )}
                                
                                {el.type === 'shape' && (
                                    <div 
                                        className="w-full h-full"
                                        style={{ 
                                            backgroundColor: el.color,
                                            borderRadius: el.content === 'circle' ? '100%' : '2px',
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                                        }}
                                    />
                                )}

                                {el.type === 'sketch' && (
                                    <div className="w-full h-full pointer-events-none opacity-90 drop-shadow-2xl">
                                        <svg viewBox={`0 0 ${el.width} ${el.height}`} className="w-full h-full">
                                            {el.data?.map((stroke: any, idx: number) => (
                                                <polyline
                                                    key={idx}
                                                    points={stroke.points.map((p: any) => `${p.x},${p.y}`).join(' ')}
                                                    fill="none"
                                                    stroke={stroke.color}
                                                    strokeWidth="4"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            ))}
                                        </svg>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contextual Properties Floating Toolbar */}
                {selectedElement && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-[#1C1C1E]/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-5">
                        <div className="flex bg-white/5 rounded-xl p-1">
                            <button onClick={() => setElements(prev => prev.map(e => e.id === selectedId ? { ...e, opacity: Math.max(0.1, (e.opacity || 1) - 0.1) } : e))} className="size-9 rounded-lg text-white/50 hover:text-white"><span className="material-symbols-outlined text-lg">opacity</span></button>
                            <button onClick={bringToFront} className="size-9 rounded-lg text-white/50 hover:text-white" title="Avancer"><span className="material-symbols-outlined text-lg">flip_to_front</span></button>
                            <button onClick={sendToBack} className="size-9 rounded-lg text-white/50 hover:text-white" title="Reculer"><span className="material-symbols-outlined text-lg">flip_to_back</span></button>
                        </div>
                        <div className="w-px h-6 bg-white/10 mx-1"></div>
                        {selectedElement.type === 'text' && (
                            <div className="flex gap-2">
                                <button onClick={() => setElements(prev => prev.map(e => e.id === selectedId ? { ...e, fontSize: (e.fontSize || 32) + 4 } : e))} className="size-9 rounded-xl bg-white/5 text-white flex items-center justify-center hover:bg-white/10"><span className="material-symbols-outlined text-lg">add</span></button>
                                <button onClick={() => setElements(prev => prev.map(e => e.id === selectedId ? { ...e, fontSize: Math.max(8, (e.fontSize || 32) - 4) } : e))} className="size-9 rounded-xl bg-white/5 text-white flex items-center justify-center hover:bg-white/10"><span className="material-symbols-outlined text-lg">remove</span></button>
                                <input 
                                    type="color" 
                                    value={selectedElement.color} 
                                    onChange={(e) => setElements(prev => prev.map(item => item.id === selectedId ? { ...item, color: e.target.value } : item))}
                                    className="size-9 bg-transparent border-none p-0 cursor-pointer overflow-hidden rounded-xl"
                                />
                            </div>
                        )}
                        <div className="w-px h-6 bg-white/10 mx-1"></div>
                        <button 
                            onClick={() => setElements(prev => prev.filter(e => e.id !== selectedId))}
                            className="size-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Export Modal */}
            {showExportPanel && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowExportPanel(false)}></div>
                    <div className="relative w-full max-w-sm bg-[#1C1C1E] border border-white/10 rounded-[2.5rem] p-10 space-y-10 animate-in zoom-in-95 shadow-2xl">
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Export Studio</h3>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">High Fidelity Rendering</p>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Format de sortie</label>
                                <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1">
                                    <button onClick={() => setExportFormat('png')} className={`flex-1 py-4 rounded-xl text-[10px] font-black transition-all ${exportFormat === 'png' ? 'bg-primary text-white' : 'text-white/40'}`}>PNG</button>
                                    <button onClick={() => setExportFormat('jpg')} className={`flex-1 py-4 rounded-xl text-[10px] font-black transition-all ${exportFormat === 'jpg' ? 'bg-primary text-white' : 'text-white/40'}`}>JPG</button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Scale (Resolution)</label>
                                <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1">
                                    {[1, 2, 4].map(s => (
                                        <button key={s} onClick={() => setExportScale(s)} className={`flex-1 py-4 rounded-xl text-[10px] font-black transition-all ${exportScale === s ? 'bg-white text-black' : 'text-white/40'}`}>{s}X</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleExport}
                            disabled={isExporting}
                            className="w-full py-6 bg-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-4 active:scale-95 transition-all border-b-8 border-orange-800 disabled:opacity-50"
                        >
                            {isExporting ? <div className="size-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <span className="material-symbols-outlined font-black">rocket_launch</span>}
                            {isExporting ? 'TRAITEMENT...' : 'LANCER LE RENDU'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
