
import React, { useState, useEffect } from 'react';

export const Persona: React.FC = () => {
    const [tone, setTone] = useState<'professional' | 'casual' | 'creative'>('professional');
    const [length, setLength] = useState(50);
    const [creativity, setCreativity] = useState(70);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('openagent_persona');
        if (saved) {
            const data = JSON.parse(saved);
            setTone(data.tone);
            setLength(data.length);
            setCreativity(data.creativity);
        }
    }, []);

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

    const getToneBorder = () => {
        switch(tone) {
            case 'professional': return 'border-primary/40';
            case 'casual': return 'border-amber-500/40';
            case 'creative': return 'border-purple-600/40';
            default: return 'border-primary/40';
        }
    };

    const getToneText = () => {
        switch(tone) {
            case 'professional': return 'text-primary';
            case 'casual': return 'text-amber-600';
            case 'creative': return 'text-purple-600';
            default: return 'text-primary';
        }
    };

    return (
        <div className="p-6 space-y-10 animate-in fade-in duration-500 bg-stellar min-h-full">
            <header className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className={`size-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-700 ${getToneBorder()} bg-white shadow-lg`}>
                        <span className={`material-symbols-outlined text-3xl font-bold ${getToneText()}`}>
                            {tone === 'creative' ? 'auto_fix_high' : tone === 'casual' ? 'coffee' : 'verified_user'}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-graphite tracking-tighter leading-none">CONFIG.</h1>
                        <p className="text-[10px] text-graphite/60 font-black uppercase tracking-[0.3em] mt-1">Behavior Tuning Suite</p>
                    </div>
                </div>
                {isSaving && (
                     <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all duration-500 ${getToneBorder()} bg-white shadow-sm`}>
                        <span className={`size-2 rounded-full animate-ping ${getToneColor()}`}></span>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${getToneText()}`}>Syncing</span>
                     </div>
                )}
            </header>

            {/* Tone Selector */}
            <section className="space-y-4">
                <div className="flex justify-between items-end px-1">
                    <p className="text-[11px] font-black text-graphite/80 uppercase tracking-[0.2em]">Mode de Comportement</p>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white border-2 ${getToneBorder()} ${getToneText()}`}>
                        Actif: {tone}
                    </span>
                </div>
                <div className="flex bg-white p-1.5 rounded-[2rem] border-2 border-intl-border shadow-sm">
                    {['Professional', 'Casual', 'Creative'].map((t) => {
                        const val = t.toLowerCase() as any;
                        const isActive = tone === val;
                        return (
                            <button
                                key={t}
                                onClick={() => updateSetting('tone', val)}
                                className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest rounded-[1.5rem] transition-all relative overflow-hidden ${
                                    isActive 
                                        ? `${getToneColor()} text-white shadow-xl scale-[1.02] z-10` 
                                        : 'text-graphite/60 hover:text-graphite hover:bg-stellar'
                                }`}
                            >
                                {t}
                            </button>
                        );
                    })}
                </div>
                
                <div className={`p-6 rounded-[2rem] border-2 transition-all duration-700 min-h-[100px] flex items-center bg-white shadow-inner ${getToneBorder()}`}>
                    <p className="text-xs text-graphite font-bold leading-relaxed italic">
                        {tone === 'professional' && "Focus sur l'efficacité : Analyse rigoureuse, terminologie sectorielle et structure stratégique."}
                        {tone === 'casual' && "Focus sur la relation : Langage naturel, décontracté et chaleureux. Comme un partenaire de confiance. ☕"}
                        {tone === 'creative' && "Focus sur l'innovation : Pensée disruptive, métaphores audacieuses et exploration de concepts originaux. 🎨"}
                    </p>
                </div>
            </section>

            {/* Sliders Area */}
            <section className="space-y-12 pt-4 px-1">
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-graphite/60 text-lg font-bold">Format_align_left</span>
                            <p className="text-[11px] font-black text-graphite uppercase tracking-widest">Longueur de réponse</p>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest py-1 px-4 rounded-full bg-white border-2 ${getToneBorder()} ${getToneText()} shadow-sm`}>
                            {length < 33 ? 'Concise' : length > 66 ? 'Détaillée' : 'Équilibrée'}
                        </span>
                    </div>
                    <div className="relative h-12 flex items-center">
                         <input 
                            type="range" 
                            value={length} 
                            onChange={(e) => updateSetting('length', Number(e.target.value))}
                            className={`w-full h-4 bg-intl-border rounded-full appearance-none cursor-pointer accent-current transition-colors duration-500 ${getToneText()} shadow-inner`} 
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-graphite/60 text-lg font-bold">psychology_alt</span>
                            <p className="text-[11px] font-black text-graphite uppercase tracking-widest">Créativité Intellectuelle</p>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest py-1 px-4 rounded-full bg-white border-2 ${getToneBorder()} ${getToneText()} shadow-sm`}>
                            {creativity < 33 ? 'Factuelle' : creativity > 66 ? 'Visionnaire' : 'Adaptative'}
                        </span>
                    </div>
                    <div className="relative h-12 flex items-center">
                        <input 
                            type="range" 
                            value={creativity} 
                            onChange={(e) => updateSetting('creativity', Number(e.target.value))}
                            className={`w-full h-4 bg-intl-border rounded-full appearance-none cursor-pointer accent-current transition-colors duration-500 ${getToneText()} shadow-inner`} 
                        />
                    </div>
                </div>
            </section>

            {/* Informational Tag */}
            <div className="pt-10 flex flex-col items-center gap-4">
                <div className="h-[2px] w-24 bg-intl-border"></div>
                <p className="text-[10px] font-black text-graphite/40 uppercase tracking-[0.4em] text-center px-10 leading-loose">
                    Paramètres d'Optimisation Neuronale v4.1
                </p>
            </div>

            <style>{`
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 32px;
                    width: 32px;
                    border-radius: 50%;
                    background: #ffffff;
                    cursor: pointer;
                    border: 5px solid currentColor;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    margin-top: -9px;
                }
                input[type=range]::-webkit-slider-runnable-track {
                    width: 100%;
                    height: 14px;
                    cursor: pointer;
                    background: #EAEAEA;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};
