
import React, { useState, useEffect } from 'react';

export const Persona: React.FC = () => {
    const [tone, setTone] = useState<'professional' | 'casual' | 'creative'>('professional');
    const [length, setLength] = useState(50);
    const [creativity, setCreativity] = useState(70);
    const [isSaving, setIsSaving] = useState(false);

    // Charger les réglages au montage
    useEffect(() => {
        const saved = localStorage.getItem('openagent_persona');
        if (saved) {
            const data = JSON.parse(saved);
            setTone(data.tone);
            setLength(data.length);
            setCreativity(data.creativity);
        }
    }, []);

    // Sauvegarder automatiquement lors du changement
    const updateSetting = (type: 'tone' | 'length' | 'creativity', value: any) => {
        setIsSaving(true);
        let newData = { tone, length, creativity };
        
        if (type === 'tone') {
            setTone(value);
            newData.tone = value;
        } else if (type === 'length') {
            setLength(value);
            newData.length = value;
        } else if (type === 'creativity') {
            setCreativity(value);
            newData.creativity = value;
        }

        localStorage.setItem('openagent_persona', JSON.stringify(newData));
        setTimeout(() => setIsSaving(false), 800);
    };

    const getToneColor = () => {
        switch(tone) {
            case 'professional': return 'bg-primary';
            case 'casual': return 'bg-amber-500';
            case 'creative': return 'bg-purple-600';
            default: return 'bg-primary';
        }
    };

    const getToneText = () => {
        switch(tone) {
            case 'professional': return 'text-primary';
            case 'casual': return 'text-amber-500';
            case 'creative': return 'text-purple-400';
            default: return 'text-primary';
        }
    };

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className={`material-symbols-outlined transition-all duration-700 text-3xl ${tone === 'casual' ? 'text-amber-500' : tone === 'creative' ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'text-primary'}`}>
                        {tone === 'creative' ? 'auto_fix_high' : 'tune'}
                    </span>
                    <div>
                        <h1 className="text-xl font-bold">Behavior Tuning</h1>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Model Brain Configuration</p>
                    </div>
                </div>
                {isSaving && (
                     <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-500 ${tone === 'casual' ? 'bg-amber-500/10 border-amber-500/20' : tone === 'creative' ? 'bg-purple-500/10 border-purple-500/20' : 'bg-primary/10 border-primary/20'}`}>
                        <span className={`size-1.5 rounded-full animate-ping ${tone === 'casual' ? 'bg-amber-500' : tone === 'creative' ? 'bg-purple-500' : 'bg-primary'}`}></span>
                        <span className={`text-[9px] font-bold uppercase ${tone === 'casual' ? 'text-amber-500' : tone === 'creative' ? 'text-purple-400' : 'text-primary'}`}>Syncing...</span>
                     </div>
                )}
            </header>

            {/* Tone Selector */}
            <section className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <p className="text-sm font-semibold text-white/40">Response Tone</p>
                    <div className="flex items-center gap-2">
                        {tone === 'professional' && (
                            <span className="text-[9px] text-primary font-bold uppercase tracking-widest flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">verified</span> Expert Mode
                            </span>
                        )}
                        {tone === 'casual' && (
                            <span className="text-[9px] text-amber-500 font-bold uppercase tracking-widest flex items-center gap-1 animate-pulse">
                                <span className="material-symbols-outlined text-xs">coffee</span> Buddy Mode
                            </span>
                        )}
                        {tone === 'creative' && (
                            <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs animate-spin-slow">auto_awesome</span> Visionary Mode
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                    {['Professional', 'Casual', 'Creative'].map((t) => {
                        const val = t.toLowerCase() as any;
                        const isActive = tone === val;
                        return (
                            <button
                                key={t}
                                onClick={() => updateSetting('tone', val)}
                                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all relative overflow-hidden group ${
                                    isActive 
                                        ? `${getToneColor()} text-white shadow-lg` 
                                        : 'text-white/40 hover:bg-white/5'
                                }`}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                                )}
                                {t}
                            </button>
                        );
                    })}
                </div>
                <div className={`p-4 rounded-2xl border transition-all duration-700 min-h-[60px] flex items-center ${tone === 'casual' ? 'bg-amber-500/5 border-amber-500/20' : tone === 'creative' ? 'bg-purple-500/5 border-purple-500/20 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]' : 'bg-white/5 border-white/5'}`}>
                    <p className="text-[10px] text-white/50 leading-relaxed italic">
                        {tone === 'professional' && "Analyse rigoureuse, terminologie sectorielle et structure stratégique."}
                        {tone === 'casual' && "Langage naturel, décontracté et chaleureux. Comme si tu parlais à un ami. ☕"}
                        {tone === 'creative' && "Pensée disruptive, métaphores audacieuses et exploration de concepts originaux. Idéal pour le brainstorming. 🎨"}
                    </p>
                </div>
            </section>

            {/* Sliders */}
            <section className="space-y-8 pt-4">
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-white/40">Response Length</p>
                        <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${getToneText()}`}>
                            {length < 33 ? 'Concise' : length > 66 ? 'Comprehensive' : 'Balanced'}
                        </span>
                    </div>
                    <input 
                        type="range" 
                        value={length} 
                        onChange={(e) => updateSetting('length', Number(e.target.value))}
                        className={`w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-current transition-colors duration-500 ${getToneText()} slider-thumb shadow-inner`} 
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-white/40">Intellectual Creativity</p>
                        <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${getToneText()}`}>
                            {creativity < 33 ? 'Factual' : creativity > 66 ? 'Visionary' : 'Adaptive'}
                        </span>
                    </div>
                    <input 
                        type="range" 
                        value={creativity} 
                        onChange={(e) => updateSetting('creativity', Number(e.target.value))}
                        className={`w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-current transition-colors duration-500 ${getToneText()} slider-thumb shadow-inner`} 
                    />
                </div>
            </section>

            <style>{`
                @keyframes shimmer {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(100%); }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow { animation: spin-slow 8s linear infinite; }
                .slider-thumb::-webkit-slider-thumb {
                    background: #ffffff;
                    border: 2px solid currentColor;
                    box-shadow: 0 0 10px rgba(0,0,0,0.2);
                }
            `}</style>
        </div>
    );
};
