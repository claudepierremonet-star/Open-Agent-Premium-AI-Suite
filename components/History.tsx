
import React, { useState } from 'react';
import { TranslationItem } from '../types';

export const History: React.FC = () => {
    const [tab, setTab] = useState<'text' | 'objects'>('text');

    const historyItems: TranslationItem[] = [
        { id: '1', from: '🇺🇸', to: '🇪🇸', fromText: 'Where can I find the nearest station?', toText: '¿Dónde puedo encontrar la estación más cercana?', timestamp: '10:30 AM', starred: false, image: 'https://picsum.photos/100/100?random=10' },
        { id: '2', from: '🇫🇷', to: '🇺🇸', fromText: 'Je voudrais un café au lait.', toText: 'I would like a coffee with milk.', timestamp: '09:15 AM', starred: true },
        { id: '4', from: '🇺🇸', to: '🇨🇳', fromText: 'Welcome to our city!', toText: '欢迎来到我们的城市！', timestamp: '08:45 AM', starred: false },
        { id: '3', from: '🇯🇵', to: '🇺🇸', fromText: '出口はどこですか？', toText: 'Where is the exit?', timestamp: 'Oct 23, 04:15 PM', starred: false, image: 'https://picsum.photos/100/100?random=11' }
    ];

    return (
        <div className="flex flex-col h-full">
            <header className="px-6 pt-6 pb-4 bg-background-dark sticky top-0 z-20">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold">History</h1>
                    <div className="flex gap-2">
                        <button className="p-2 hover:bg-white/5 rounded-full"><span className="material-symbols-outlined">search</span></button>
                        <button className="p-2 hover:bg-white/5 rounded-full"><span className="material-symbols-outlined">more_vert</span></button>
                    </div>
                </div>
                <div className="flex p-1 bg-white/5 rounded-xl">
                    <button 
                        onClick={() => setTab('text')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === 'text' ? 'bg-primary text-white shadow-neon' : 'text-white/40'}`}
                    >Text</button>
                    <button 
                        onClick={() => setTab('objects')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === 'objects' ? 'bg-primary text-white shadow-neon' : 'text-white/40'}`}
                    >Objects</button>
                </div>
            </header>

            <div className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
                <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4 px-2">Today</h3>
                    <div className="space-y-3 pb-8">
                        {historyItems.filter(item => tab === 'text' || item.image).map(item => (
                            <div key={item.id} className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col gap-3 group active:scale-[0.98] transition-all">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{item.from}</span>
                                        <span className="material-symbols-outlined text-[14px] text-primary">arrow_forward</span>
                                        <span className="text-lg">{item.to}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`material-symbols-outlined text-[18px] ${item.starred ? 'text-amber-400 fill-1' : 'text-white/20'}`}>star</span>
                                        <span className="text-[9px] text-white/20 font-bold uppercase">{item.timestamp}</span>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <p className="text-xs text-white/50 italic mb-1 truncate">"{item.fromText}"</p>
                                        <p className="text-sm font-bold text-primary break-words">"{item.toText}"</p>
                                    </div>
                                    {item.image && (
                                        <div className="size-14 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                            <img src={item.image} alt="Ref" className="w-full h-full object-cover grayscale opacity-50" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
